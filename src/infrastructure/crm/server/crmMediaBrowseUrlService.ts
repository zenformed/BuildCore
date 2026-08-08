/**
 * Authorized CRM media browse URLs (Phase 0 + Phase 1 image derivatives).
 *
 * BuildCore checks org/document access, then mints a short-lived signed Storage
 * URL for the preferred variant (thumbnail / preview / original) with fallback.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { IDocumentStorageProvider } from '@/application/ports/storage/IDocumentStorageProvider';
import {
  buildCrmMediaBrowseSource,
  CRM_MEDIA_BROWSE_SIGNED_URL_TTL_SECONDS,
  type CrmMediaBrowseSource,
  type CrmMediaBrowseVariant,
} from '@/domain/crm/mediaBrowse';
import { BUILDCORE_DOCUMENT_STORAGE_BUCKET } from '@/domain/crm/documentUpload';
import { CRM_DOCUMENT_IMAGE_DERIVATIVE_COLUMNS } from '@/domain/crm/imageDerivatives';
import { isPaymentWorkflowTask } from '@/domain/crm/paymentWorkflow';
import { CrmDocumentServiceError } from '@/infrastructure/crm/errors';
import type { DbCrmDocumentRow } from '@/infrastructure/crm/mappers/mapCrmFromDb';
import { requireBuildCoreDownloadPermission } from './buildCoreDownloadPermissionService';
import { resolveCrmProjectIdBySlug } from './resolveCrmProjectIdBySlug';

const DOCUMENT_SELECT =
  `id, project_id, workflow_task_id, budget_entry_id, document_type, file_name, mime_type, file_size_bytes, upload_status, uploaded_by_member_id, reviewed_by_member_id, reviewed_at, created_at, safe_file_name, storage_provider, storage_bucket, storage_key, storage_path, deleted_at, latitude, longitude, location_accuracy_meters, location_source, location_captured_at, ${CRM_DOCUMENT_IMAGE_DERIVATIVE_COLUMNS}`;

export type CreateAuthorizedCrmMediaBrowseSourceInput = {
  readonly supabase: SupabaseClient;
  readonly storage: IDocumentStorageProvider;
  readonly organizationId: string;
  readonly userId: string;
  readonly projectSlug: string;
  readonly documentId: string;
  /** Preferred delivery variant; falls back to original when derivative missing. */
  readonly preferredVariant?: CrmMediaBrowseVariant;
};

export type CreateAuthorizedCrmMediaBrowseSourceResult =
  | { readonly ok: true; readonly source: CrmMediaBrowseSource }
  | { readonly ok: false; readonly response: import('next/server').NextResponse };

async function getReadyDocumentForOrg(
  supabase: SupabaseClient,
  organizationId: string,
  documentId: string
): Promise<DbCrmDocumentRow | null> {
  const { data, error } = await supabase
    .from('crm_documents')
    .select(DOCUMENT_SELECT)
    .eq('id', documentId)
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as DbCrmDocumentRow | null) ?? null;
}

async function resolveWorkflowTaskPermissionDomain(
  supabase: SupabaseClient,
  organizationId: string,
  projectId: string,
  workflowTaskId: string
): Promise<'workflow_tasks' | 'payments'> {
  const { data, error } = await supabase
    .from('crm_workflow_tasks')
    .select('amount_cents')
    .eq('organization_id', organizationId)
    .eq('project_id', projectId)
    .eq('id', workflowTaskId)
    .maybeSingle();

  if (error != null || data == null) {
    return 'workflow_tasks';
  }

  return isPaymentWorkflowTask({
    amountCents: data.amount_cents == null ? null : Number(data.amount_cents),
  })
    ? 'payments'
    : 'workflow_tasks';
}

function resolveBrowseStorageTarget(
  row: DbCrmDocumentRow,
  preferredVariant: CrmMediaBrowseVariant
): { storageKey: string; variant: CrmMediaBrowseVariant; mimeType: string } {
  const originalKey = row.storage_key ?? row.storage_path;
  if (!originalKey) {
    throw new CrmDocumentServiceError('not_found', 'Document file is unavailable');
  }

  if (
    preferredVariant === 'thumbnail' &&
    typeof row.thumbnail_storage_key === 'string' &&
    row.thumbnail_storage_key.trim() !== ''
  ) {
    return {
      storageKey: row.thumbnail_storage_key,
      variant: 'thumbnail',
      mimeType: 'image/webp',
    };
  }

  if (
    preferredVariant === 'preview' &&
    typeof row.preview_storage_key === 'string' &&
    row.preview_storage_key.trim() !== ''
  ) {
    return {
      storageKey: row.preview_storage_key,
      variant: 'preview',
      mimeType: 'image/webp',
    };
  }

  return {
    storageKey: originalKey,
    variant: 'original',
    mimeType: row.mime_type?.trim() || 'application/octet-stream',
  };
}

/**
 * Authorize the viewer for the document (same gates as download routes), then
 * return a signed browse source for the preferred variant (with original fallback).
 */
export async function createAuthorizedCrmMediaBrowseSource(
  input: CreateAuthorizedCrmMediaBrowseSourceInput
): Promise<CreateAuthorizedCrmMediaBrowseSourceResult> {
  const projectId = await resolveCrmProjectIdBySlug(
    input.supabase,
    input.organizationId,
    input.projectSlug
  );
  if (!projectId) {
    throw new CrmDocumentServiceError('not_found', 'Project not found');
  }

  const row = await getReadyDocumentForOrg(
    input.supabase,
    input.organizationId,
    input.documentId
  );
  if (!row || row.project_id !== projectId) {
    throw new CrmDocumentServiceError('not_found', 'Document not found');
  }
  if (row.upload_status !== 'ready') {
    throw new CrmDocumentServiceError('not_found', 'Document file is unavailable');
  }

  if (row.budget_entry_id != null) {
    const permission = await requireBuildCoreDownloadPermission(
      input.supabase,
      input.organizationId,
      input.userId,
      'budget'
    );
    if (!permission.ok) return { ok: false, response: permission.response };
  } else if (row.workflow_task_id != null) {
    const domain = await resolveWorkflowTaskPermissionDomain(
      input.supabase,
      input.organizationId,
      projectId,
      row.workflow_task_id
    );
    const permission = await requireBuildCoreDownloadPermission(
      input.supabase,
      input.organizationId,
      input.userId,
      domain
    );
    if (!permission.ok) return { ok: false, response: permission.response };
  }

  const preferredVariant = input.preferredVariant ?? 'original';
  const target = resolveBrowseStorageTarget(row, preferredVariant);
  const bucket = row.storage_bucket ?? BUILDCORE_DOCUMENT_STORAGE_BUCKET;
  const url = await input.storage.createSignedDownloadUrl({
    bucket,
    storageKey: target.storageKey,
    expiresInSeconds: CRM_MEDIA_BROWSE_SIGNED_URL_TTL_SECONDS,
  });

  return {
    ok: true,
    source: buildCrmMediaBrowseSource({
      url,
      expiresInSeconds: CRM_MEDIA_BROWSE_SIGNED_URL_TTL_SECONDS,
      mimeType: target.mimeType,
      variant: target.variant,
    }),
  };
}
