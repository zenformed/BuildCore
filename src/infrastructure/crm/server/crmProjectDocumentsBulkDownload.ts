/**
 * Bulk document download for a project/subproject: one file or a ZIP of many.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import JSZip from 'jszip';
import type { IDocumentStorageProvider } from '@/application/ports/storage/IDocumentStorageProvider';
import {
  buildDocumentsZipFileName,
  uniqueZipEntryFileNames,
} from '@/domain/crm/documentZipEntryNames';
import { isPaymentWorkflowTask } from '@/domain/crm/paymentWorkflow';
import type { BuildCorePermissionDomain } from '@/domain/buildcore/rolePermissions';
import { CrmDocumentServiceError } from '@/infrastructure/crm/errors';
import type { DbCrmDocumentRow } from '@/infrastructure/crm/mappers/mapCrmFromDb';
import {
  requireBuildCoreDownloadPermission,
} from '@/infrastructure/crm/server/buildCoreDownloadPermissionService';
import {
  loadCrmDocumentAttachmentFromRow,
  type CrmDocumentAttachmentPayload,
} from '@/infrastructure/crm/server/crmDocumentDownloadResponse';
import { resolveCrmProjectIdBySlug } from '@/infrastructure/crm/server/resolveCrmProjectIdBySlug';

const DOCUMENT_SELECT =
  'id, project_id, workflow_task_id, budget_entry_id, document_type, file_name, mime_type, file_size_bytes, upload_status, uploaded_by_member_id, reviewed_by_member_id, reviewed_at, created_at, safe_file_name, storage_provider, storage_bucket, storage_key, storage_path, deleted_at, latitude, longitude, location_accuracy_meters, location_source, location_captured_at';

export type CrmProjectDocumentsBulkDownloadResult = CrmDocumentAttachmentPayload;

export async function buildCrmDocumentsBulkAttachmentResult(
  attachments: readonly CrmDocumentAttachmentPayload[],
  zipFileName: string
): Promise<CrmDocumentAttachmentPayload> {
  if (attachments.length === 0) {
    throw new CrmDocumentServiceError('not_found', 'No documents were found');
  }
  if (attachments.length === 1) return attachments[0]!;

  const entryNames = uniqueZipEntryFileNames(attachments.map((item) => item.fileName));
  const zip = new JSZip();
  for (let i = 0; i < attachments.length; i += 1) {
    zip.file(entryNames[i]!, attachments[i]!.buffer);
  }
  const zipBuffer = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });
  return {
    fileName: zipFileName,
    mimeType: 'application/zip',
    buffer: Buffer.from(zipBuffer),
  };
}

function resolveDocumentDownloadDomain(
  row: Pick<DbCrmDocumentRow, 'workflow_task_id' | 'budget_entry_id'>,
  taskAmountCents: number | null | undefined
): BuildCorePermissionDomain | null {
  if (row.budget_entry_id != null) return 'budget';
  if (row.workflow_task_id != null) {
    if (taskAmountCents != null && isPaymentWorkflowTask({ amountCents: taskAmountCents })) {
      return 'payments';
    }
    return 'workflow_tasks';
  }
  return null;
}

async function loadProjectName(
  supabase: SupabaseClient,
  organizationId: string,
  projectId: string
): Promise<string> {
  const { data, error } = await supabase
    .from('crm_projects')
    .select('name')
    .eq('organization_id', organizationId)
    .eq('id', projectId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return typeof data?.name === 'string' ? data.name : '';
}

async function loadTaskAmountCentsById(
  supabase: SupabaseClient,
  organizationId: string,
  projectId: string,
  taskIds: readonly string[]
): Promise<Map<string, number | null>> {
  const map = new Map<string, number | null>();
  if (taskIds.length === 0) return map;

  const { data, error } = await supabase
    .from('crm_workflow_tasks')
    .select('id, amount_cents')
    .eq('organization_id', organizationId)
    .eq('project_id', projectId)
    .in('id', [...taskIds]);

  if (error) throw new Error(error.message);
  for (const row of data ?? []) {
    const id = row.id as string;
    const amount = row.amount_cents == null ? null : Number(row.amount_cents);
    map.set(id, Number.isFinite(amount as number) ? (amount as number) : null);
  }
  return map;
}

export async function buildCrmProjectDocumentsBulkDownloadForOrg(
  supabase: SupabaseClient,
  storage: IDocumentStorageProvider,
  organizationId: string,
  userId: string,
  input: {
    readonly projectSlug: string;
    readonly documentIds: readonly string[];
  }
): Promise<CrmProjectDocumentsBulkDownloadResult> {
  const uniqueIds = [...new Set(input.documentIds.map((id) => id.trim()).filter(Boolean))];
  if (uniqueIds.length === 0) {
    throw new CrmDocumentServiceError('INVALID_FILE_TYPE', 'Select at least one document to download');
  }

  const projectId = await resolveCrmProjectIdBySlug(supabase, organizationId, input.projectSlug);
  if (!projectId) {
    throw new CrmDocumentServiceError('not_found', 'Project not found');
  }

  const { data, error } = await supabase
    .from('crm_documents')
    .select(DOCUMENT_SELECT)
    .eq('organization_id', organizationId)
    .eq('project_id', projectId)
    .is('deleted_at', null)
    .eq('upload_status', 'ready')
    .in('id', uniqueIds);

  if (error) throw new Error(error.message);
  const rows = (data ?? []) as DbCrmDocumentRow[];
  if (rows.length !== uniqueIds.length) {
    throw new CrmDocumentServiceError(
      'not_found',
      'One or more documents were not found on this project'
    );
  }

  const rowById = new Map(rows.map((row) => [row.id, row] as const));
  const orderedRows = uniqueIds.map((id) => {
    const row = rowById.get(id);
    if (row == null) {
      throw new CrmDocumentServiceError('not_found', 'Document not found');
    }
    return row;
  });

  const taskIds = [
    ...new Set(
      orderedRows
        .map((row) => row.workflow_task_id)
        .filter((id): id is string => id != null && id.trim() !== '')
    ),
  ];
  const taskAmountById = await loadTaskAmountCentsById(
    supabase,
    organizationId,
    projectId,
    taskIds
  );

  const permissionCache = new Map<BuildCorePermissionDomain, boolean>();
  for (const row of orderedRows) {
    const domain = resolveDocumentDownloadDomain(
      row,
      row.workflow_task_id != null ? taskAmountById.get(row.workflow_task_id) : null
    );
    if (domain == null) continue;

    let allowed = permissionCache.get(domain);
    if (allowed == null) {
      const permission = await requireBuildCoreDownloadPermission(
        supabase,
        organizationId,
        userId,
        domain
      );
      allowed = permission.ok;
      permissionCache.set(domain, allowed);
      if (!allowed) {
        throw new CrmDocumentServiceError(
          'forbidden',
          'You do not have permission to download one or more selected documents'
        );
      }
    } else if (!allowed) {
      throw new CrmDocumentServiceError(
        'forbidden',
        'You do not have permission to download one or more selected documents'
      );
    }
  }

  const attachments: CrmDocumentAttachmentPayload[] = [];
  for (const row of orderedRows) {
    try {
      attachments.push(await loadCrmDocumentAttachmentFromRow(storage, row));
    } catch {
      throw new CrmDocumentServiceError(
        'not_found',
        `Could not load file for “${row.file_name || 'document'}”`
      );
    }
  }

  const projectName = await loadProjectName(supabase, organizationId, projectId);
  return buildCrmDocumentsBulkAttachmentResult(
    attachments,
    buildDocumentsZipFileName(projectName)
  );
}
