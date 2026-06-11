import type { SupabaseClient } from '@supabase/supabase-js';
import type { CrmDocumentMetadata } from '@/domain/crm';
import {
  BUILDCORE_DOCUMENT_STORAGE_BUCKET,
  BUILDCORE_DOCUMENT_STORAGE_PROVIDER,
  buildBudgetEntryDocumentStorageKey,
  buildSafeDocumentFileName,
  validateWorkflowTaskDocumentUpload,
} from '@/domain/crm/documentUpload';
import type {
  BudgetEntryDocumentDownload,
  CreateBudgetEntryDocumentDownloadInput,
  DeleteBudgetEntryDocumentInput,
  ListBudgetEntryDocumentsInput,
  UploadBudgetEntryDocumentInput,
} from '@/domain/crm/documentMutations';
import { CrmDocumentServiceError } from '@/infrastructure/crm/errors';
import { mapDbDocument, type DbCrmDocumentRow } from '@/infrastructure/crm/mappers/mapCrmFromDb';
import type { IDocumentStorageProvider } from '@/application/ports/storage/IDocumentStorageProvider';
import { appendCrmAccountabilityEvent } from './crmAccountability';
import {
  loadCrmDocumentAttachmentFromRow,
  type CrmDocumentAttachmentPayload,
} from './crmDocumentDownloadResponse';
import {
  releaseOrganizationStorage,
  reserveOrganizationStorage,
} from './crmOrganizationStorage';
import { loadCrmMemberMap } from './crmMemberMap';
import { resolveCrmProjectIdBySlug } from './resolveCrmProjectIdBySlug';

const DOCUMENT_SELECT =
  'id, project_id, workflow_task_id, budget_entry_id, document_type, file_name, mime_type, file_size_bytes, upload_status, uploaded_by_member_id, reviewed_by_member_id, reviewed_at, created_at, safe_file_name, storage_provider, storage_bucket, storage_key, deleted_at';

const BUDGET_ENTRY_SELECT = 'id, project_id, item_name';

type DbCrmBudgetEntryRow = {
  id: string;
  project_id: string;
  item_name: string;
};

async function getBudgetEntryForOrg(
  supabase: SupabaseClient,
  organizationId: string,
  budgetEntryId: string
): Promise<DbCrmBudgetEntryRow | null> {
  const { data, error } = await supabase
    .from('crm_project_budget_entries')
    .select(BUDGET_ENTRY_SELECT)
    .eq('id', budgetEntryId)
    .eq('organization_id', organizationId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as DbCrmBudgetEntryRow | null) ?? null;
}

async function getDocumentForOrg(
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

async function mapBudgetDocumentRow(
  supabase: SupabaseClient,
  row: DbCrmDocumentRow
): Promise<CrmDocumentMetadata> {
  const memberById = await loadCrmMemberMap(supabase, [
    row.uploaded_by_member_id,
    row.reviewed_by_member_id,
  ].filter((id): id is string => id != null));
  return mapDbDocument(row, new Map(), memberById);
}

export async function listBudgetEntryDocumentsForOrg(
  supabase: SupabaseClient,
  organizationId: string,
  input: ListBudgetEntryDocumentsInput
): Promise<readonly CrmDocumentMetadata[]> {
  const projectId = await resolveCrmProjectIdBySlug(supabase, organizationId, input.projectSlug);
  if (!projectId) return [];

  const entry = await getBudgetEntryForOrg(supabase, organizationId, input.budgetEntryId);
  if (!entry || entry.project_id !== projectId) return [];

  const { data, error } = await supabase
    .from('crm_documents')
    .select(DOCUMENT_SELECT)
    .eq('organization_id', organizationId)
    .eq('budget_entry_id', input.budgetEntryId)
    .is('deleted_at', null)
    .eq('upload_status', 'ready')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  const rows = (data ?? []) as DbCrmDocumentRow[];
  return Promise.all(rows.map((row) => mapBudgetDocumentRow(supabase, row)));
}

export async function uploadBudgetEntryDocumentForOrg(
  supabase: SupabaseClient,
  storage: IDocumentStorageProvider,
  organizationId: string,
  actorUserId: string,
  input: UploadBudgetEntryDocumentInput
): Promise<CrmDocumentMetadata> {
  const validation = validateWorkflowTaskDocumentUpload({
    fileName: input.fileName,
    mimeType: input.mimeType,
    sizeBytes: input.sizeBytes,
  });
  if (!validation.ok) {
    throw new CrmDocumentServiceError(validation.code, validation.message);
  }

  const projectId = await resolveCrmProjectIdBySlug(supabase, organizationId, input.projectSlug);
  if (!projectId) {
    throw new CrmDocumentServiceError('not_found', 'Project not found');
  }

  const entry = await getBudgetEntryForOrg(supabase, organizationId, input.budgetEntryId);
  if (!entry || entry.project_id !== projectId) {
    throw new CrmDocumentServiceError('not_found', 'Budget entry not found');
  }

  const safeFileName = buildSafeDocumentFileName(input.fileName);
  const documentId = crypto.randomUUID();
  const storageKey = buildBudgetEntryDocumentStorageKey({
    organizationId,
    projectId,
    budgetEntryId: input.budgetEntryId,
    documentId,
    safeFileName,
  });

  await reserveOrganizationStorage(supabase, organizationId, input.sizeBytes);

  const { data: inserted, error: insertError } = await supabase
    .from('crm_documents')
    .insert({
      id: documentId,
      organization_id: organizationId,
      project_id: projectId,
      workflow_task_id: null,
      budget_entry_id: input.budgetEntryId,
      document_type: 'other',
      file_name: input.fileName.trim(),
      safe_file_name: safeFileName,
      mime_type: input.mimeType.trim() || 'application/octet-stream',
      file_size_bytes: input.sizeBytes,
      storage_path: storageKey,
      storage_provider: BUILDCORE_DOCUMENT_STORAGE_PROVIDER,
      storage_bucket: BUILDCORE_DOCUMENT_STORAGE_BUCKET,
      storage_key: storageKey,
      upload_status: 'pending',
      uploaded_by_member_id: actorUserId,
    })
    .select(DOCUMENT_SELECT)
    .single();

  if (insertError || !inserted) {
    await releaseOrganizationStorage(supabase, organizationId, input.sizeBytes).catch(() => undefined);
    throw new Error(insertError?.message ?? 'Failed to create document metadata');
  }

  try {
    await storage.putObject({
      bucket: BUILDCORE_DOCUMENT_STORAGE_BUCKET,
      storageKey,
      mimeType: input.mimeType.trim() || 'application/octet-stream',
      body: new Uint8Array(input.body),
    });
  } catch (err) {
    await supabase.from('crm_documents').delete().eq('id', documentId);
    await releaseOrganizationStorage(supabase, organizationId, input.sizeBytes).catch(() => undefined);
    throw err;
  }

  const { data: readyRow, error: readyError } = await supabase
    .from('crm_documents')
    .update({ upload_status: 'ready' })
    .eq('id', documentId)
    .select(DOCUMENT_SELECT)
    .single();

  if (readyError || !readyRow) {
    await storage.deleteObject({ bucket: BUILDCORE_DOCUMENT_STORAGE_BUCKET, storageKey });
    await supabase.from('crm_documents').delete().eq('id', documentId);
    await releaseOrganizationStorage(supabase, organizationId, input.sizeBytes).catch(() => undefined);
    throw new Error(readyError?.message ?? 'Failed to finalize document upload');
  }

  await appendCrmAccountabilityEvent(supabase, {
    organizationId,
    projectId,
    actorMemberId: actorUserId,
    eventType: 'document_uploaded',
    summary: `Uploaded document "${input.fileName.trim()}" to budget item "${entry.item_name}"`,
    metadata: {
      document_id: documentId,
      budget_entry_id: input.budgetEntryId,
      file_size_bytes: input.sizeBytes,
      mime_type: input.mimeType,
    },
  });

  await supabase
    .from('crm_projects')
    .update({ last_activity_at: new Date().toISOString() })
    .eq('id', projectId);

  return mapBudgetDocumentRow(supabase, readyRow as DbCrmDocumentRow);
}

export async function deleteBudgetEntryDocumentForOrg(
  supabase: SupabaseClient,
  storage: IDocumentStorageProvider,
  organizationId: string,
  actorUserId: string,
  input: DeleteBudgetEntryDocumentInput
): Promise<void> {
  const projectId = await resolveCrmProjectIdBySlug(supabase, organizationId, input.projectSlug);
  if (!projectId) {
    throw new CrmDocumentServiceError('not_found', 'Project not found');
  }

  const row = await getDocumentForOrg(supabase, organizationId, input.documentId);
  if (!row || row.project_id !== projectId || row.budget_entry_id !== input.budgetEntryId) {
    throw new CrmDocumentServiceError('not_found', 'Document not found');
  }

  const entry = await getBudgetEntryForOrg(supabase, organizationId, input.budgetEntryId);
  const storageKey = row.storage_key ?? row.storage_path;
  const bucket = row.storage_bucket ?? BUILDCORE_DOCUMENT_STORAGE_BUCKET;
  const now = new Date().toISOString();

  const { error: softDeleteError } = await supabase
    .from('crm_documents')
    .update({ deleted_at: now })
    .eq('id', row.id);

  if (softDeleteError) throw new Error(softDeleteError.message);

  if (storageKey) {
    try {
      await storage.deleteObject({ bucket, storageKey });
    } catch {
      /* storage object may already be gone */
    }
  }

  await releaseOrganizationStorage(supabase, organizationId, Number(row.file_size_bytes));

  await appendCrmAccountabilityEvent(supabase, {
    organizationId,
    projectId,
    actorMemberId: actorUserId,
    eventType: 'document_deleted',
    summary: `Deleted document "${row.file_name}" from budget item "${entry?.item_name ?? 'item'}"`,
    metadata: { document_id: row.id, budget_entry_id: input.budgetEntryId },
  });
}

export async function resolveBudgetEntryDocumentAttachmentForOrg(
  supabase: SupabaseClient,
  storage: IDocumentStorageProvider,
  organizationId: string,
  input: CreateBudgetEntryDocumentDownloadInput
): Promise<CrmDocumentAttachmentPayload> {
  const projectId = await resolveCrmProjectIdBySlug(supabase, organizationId, input.projectSlug);
  if (!projectId) {
    throw new CrmDocumentServiceError('not_found', 'Project not found');
  }

  const row = await getDocumentForOrg(supabase, organizationId, input.documentId);
  if (!row || row.project_id !== projectId || row.budget_entry_id !== input.budgetEntryId) {
    throw new CrmDocumentServiceError('not_found', 'Document not found');
  }

  return loadCrmDocumentAttachmentFromRow(storage, row);
}

export async function createBudgetEntryDocumentDownloadForOrg(
  supabase: SupabaseClient,
  storage: IDocumentStorageProvider,
  organizationId: string,
  input: CreateBudgetEntryDocumentDownloadInput
): Promise<BudgetEntryDocumentDownload> {
  const projectId = await resolveCrmProjectIdBySlug(supabase, organizationId, input.projectSlug);
  if (!projectId) {
    throw new CrmDocumentServiceError('not_found', 'Project not found');
  }

  const row = await getDocumentForOrg(supabase, organizationId, input.documentId);
  if (!row || row.project_id !== projectId || row.budget_entry_id !== input.budgetEntryId) {
    throw new CrmDocumentServiceError('not_found', 'Document not found');
  }

  const storageKey = row.storage_key ?? row.storage_path;
  if (!storageKey) {
    throw new CrmDocumentServiceError('not_found', 'Document file is unavailable');
  }

  const bucket = row.storage_bucket ?? BUILDCORE_DOCUMENT_STORAGE_BUCKET;
  const url = await storage.createSignedDownloadUrl({ bucket, storageKey });

  return {
    url,
    fileName: row.file_name,
    mimeType: row.mime_type,
  };
}
