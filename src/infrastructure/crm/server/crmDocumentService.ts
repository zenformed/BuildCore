import type { SupabaseClient } from '@supabase/supabase-js';
import type { CrmDocumentMetadata } from '@/domain/crm';
import {
  BUILDCORE_DOCUMENT_STORAGE_BUCKET,
  BUILDCORE_DOCUMENT_STORAGE_PROVIDER,
  buildSafeDocumentFileName,
  buildWorkflowTaskDocumentStorageKey,
  validateWorkflowTaskDocumentUpload,
} from '@/domain/crm/documentUpload';
import type {
  CreateWorkflowTaskDocumentDownloadInput,
  DeleteWorkflowTaskDocumentInput,
  ListWorkflowTaskDocumentsInput,
  UploadWorkflowTaskDocumentInput,
  WorkflowTaskDocumentDownload,
} from '@/domain/crm/documentMutations';
import { CrmDocumentServiceError } from '@/infrastructure/crm/errors';
import {
  mapDbDocument,
  type DbCrmDocumentRow,
  type DbCrmWorkflowTaskRow,
} from '@/infrastructure/crm/mappers/mapCrmFromDb';
import type { IDocumentStorageProvider } from '@/application/ports/storage/IDocumentStorageProvider';
import { appendCrmAccountabilityEvent } from './crmAccountability';
import {
  releaseOrganizationStorage,
  reserveOrganizationStorage,
} from './crmOrganizationStorage';
import { loadCrmMemberMap } from './crmMemberMap';
import { resolveCrmProjectIdBySlug } from './resolveCrmProjectIdBySlug';

const DOCUMENT_SELECT =
  'id, project_id, workflow_task_id, document_type, file_name, mime_type, file_size_bytes, upload_status, uploaded_by_member_id, reviewed_by_member_id, reviewed_at, created_at, safe_file_name, storage_provider, storage_bucket, storage_key, deleted_at';

const TASK_SELECT = 'id, project_id, stage_slug, title, documents_required';

async function getTaskForOrg(
  supabase: SupabaseClient,
  organizationId: string,
  workflowTaskId: string
): Promise<DbCrmWorkflowTaskRow | null> {
  const { data, error } = await supabase
    .from('crm_workflow_tasks')
    .select(TASK_SELECT)
    .eq('id', workflowTaskId)
    .eq('organization_id', organizationId)
    .is('archived_at', null)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as DbCrmWorkflowTaskRow | null) ?? null;
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

async function mapDocumentRow(
  supabase: SupabaseClient,
  row: DbCrmDocumentRow,
  stageSlug: string
): Promise<CrmDocumentMetadata> {
  const memberById = await loadCrmMemberMap(supabase, [
    row.uploaded_by_member_id,
    row.reviewed_by_member_id,
  ].filter((id): id is string => id != null));
  const stageSlugByTaskId = new Map<string, import('@/domain/crm').PipelineStageSlug>([
    [row.workflow_task_id, stageSlug as import('@/domain/crm').PipelineStageSlug],
  ]);
  return mapDbDocument(row, stageSlugByTaskId, memberById);
}

export async function countActiveWorkflowTaskDocumentsForOrg(
  supabase: SupabaseClient,
  organizationId: string,
  workflowTaskId: string
): Promise<number> {
  const { count, error } = await supabase
    .from('crm_documents')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .eq('workflow_task_id', workflowTaskId)
    .is('deleted_at', null)
    .eq('upload_status', 'ready');
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function listWorkflowTaskDocumentsForOrg(
  supabase: SupabaseClient,
  organizationId: string,
  input: ListWorkflowTaskDocumentsInput
): Promise<readonly CrmDocumentMetadata[]> {
  const projectId = await resolveCrmProjectIdBySlug(supabase, organizationId, input.projectSlug);
  if (!projectId) return [];

  const task = await getTaskForOrg(supabase, organizationId, input.workflowTaskId);
  if (!task || task.project_id !== projectId) return [];

  const { data, error } = await supabase
    .from('crm_documents')
    .select(DOCUMENT_SELECT)
    .eq('organization_id', organizationId)
    .eq('workflow_task_id', input.workflowTaskId)
    .is('deleted_at', null)
    .eq('upload_status', 'ready')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  const rows = (data ?? []) as DbCrmDocumentRow[];
  return Promise.all(rows.map((row) => mapDocumentRow(supabase, row, task.stage_slug)));
}

export async function uploadWorkflowTaskDocumentForOrg(
  supabase: SupabaseClient,
  storage: IDocumentStorageProvider,
  organizationId: string,
  actorUserId: string,
  input: UploadWorkflowTaskDocumentInput
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

  const task = await getTaskForOrg(supabase, organizationId, input.workflowTaskId);
  if (!task || task.project_id !== projectId) {
    throw new CrmDocumentServiceError('not_found', 'Workflow task not found');
  }

  const safeFileName = buildSafeDocumentFileName(input.fileName);
  const documentId = crypto.randomUUID();
  const storageKey = buildWorkflowTaskDocumentStorageKey({
    organizationId,
    projectId,
    workflowTaskId: input.workflowTaskId,
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
      workflow_task_id: input.workflowTaskId,
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
    summary: `Uploaded document "${input.fileName.trim()}" to task "${task.title}"`,
    workflowTaskId: input.workflowTaskId,
    metadata: {
      document_id: documentId,
      file_size_bytes: input.sizeBytes,
      mime_type: input.mimeType,
    },
  });

  await supabase
    .from('crm_projects')
    .update({ last_activity_at: new Date().toISOString() })
    .eq('id', projectId);

  return mapDocumentRow(supabase, readyRow as DbCrmDocumentRow, task.stage_slug);
}

export async function deleteWorkflowTaskDocumentForOrg(
  supabase: SupabaseClient,
  storage: IDocumentStorageProvider,
  organizationId: string,
  actorUserId: string,
  input: DeleteWorkflowTaskDocumentInput
): Promise<void> {
  const projectId = await resolveCrmProjectIdBySlug(supabase, organizationId, input.projectSlug);
  if (!projectId) {
    throw new CrmDocumentServiceError('not_found', 'Project not found');
  }

  const row = await getDocumentForOrg(supabase, organizationId, input.documentId);
  if (!row || row.project_id !== projectId || row.workflow_task_id !== input.workflowTaskId) {
    throw new CrmDocumentServiceError('not_found', 'Document not found');
  }

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

  const task = await getTaskForOrg(supabase, organizationId, input.workflowTaskId);

  await appendCrmAccountabilityEvent(supabase, {
    organizationId,
    projectId,
    actorMemberId: actorUserId,
    eventType: 'document_deleted',
    summary: `Deleted document "${row.file_name}" from task "${task?.title ?? 'task'}"`,
    workflowTaskId: input.workflowTaskId,
    metadata: { document_id: row.id },
  });
}

export async function createWorkflowTaskDocumentDownloadForOrg(
  supabase: SupabaseClient,
  storage: IDocumentStorageProvider,
  organizationId: string,
  input: CreateWorkflowTaskDocumentDownloadInput
): Promise<WorkflowTaskDocumentDownload> {
  const projectId = await resolveCrmProjectIdBySlug(supabase, organizationId, input.projectSlug);
  if (!projectId) {
    throw new CrmDocumentServiceError('not_found', 'Project not found');
  }

  const row = await getDocumentForOrg(supabase, organizationId, input.documentId);
  if (!row || row.project_id !== projectId || row.workflow_task_id !== input.workflowTaskId) {
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

export async function assertWorkflowTaskCanBeMarkedDone(
  supabase: SupabaseClient,
  organizationId: string,
  task: DbCrmWorkflowTaskRow
): Promise<void> {
  if (!task.documents_required) return;
  const count = await countActiveWorkflowTaskDocumentsForOrg(
    supabase,
    organizationId,
    task.id
  );
  if (count < 1) {
    throw new CrmDocumentServiceError(
      'DOCUMENTS_REQUIRED',
      'Upload at least one document before marking this task done.'
    );
  }
}
