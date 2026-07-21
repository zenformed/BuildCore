import type { SupabaseClient } from '@supabase/supabase-js';
import type { IDocumentStorageProvider } from '@/application/ports/storage/IDocumentStorageProvider';
import { CrmDocumentServiceError } from '@/infrastructure/crm/errors';
import type { DbCrmDocumentRow } from '@/infrastructure/crm/mappers/mapCrmFromDb';
import { deleteWorkflowTaskDocumentForOrg, deleteProjectMediaDocumentForOrg } from './crmDocumentService';
import { deleteBudgetEntryDocumentForOrg } from './crmBudgetEntryDocumentService';
import {
  loadOrganizationPhotoAccessContext,
  resolveOrganizationPhotoDocumentAccess,
  type OrganizationPhotoTaskRow,
} from './crmOrganizationPhotoAccess';

const DOCUMENT_SELECT =
  'id, project_id, workflow_task_id, budget_entry_id, document_type, file_name, mime_type, file_size_bytes, upload_status, uploaded_by_member_id, reviewed_by_member_id, reviewed_at, created_at, safe_file_name, storage_provider, storage_bucket, storage_key, storage_path, deleted_at';

export async function deleteCrmOrganizationPhotosForViewer(
  supabase: SupabaseClient,
  storage: IDocumentStorageProvider,
  organizationId: string,
  userId: string,
  documentIds: readonly string[]
): Promise<{ readonly deletedCount: number; readonly failedCount: number }> {
  const ids = [...new Set(documentIds.map((id) => id.trim()).filter(Boolean))];
  const { data, error } = await supabase
    .from('crm_documents')
    .select(DOCUMENT_SELECT)
    .eq('organization_id', organizationId)
    .in('id', ids)
    .like('mime_type', 'image/%')
    .eq('upload_status', 'ready')
    .is('deleted_at', null);
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as DbCrmDocumentRow[];
  if (rows.length !== ids.length) {
    throw new CrmDocumentServiceError('not_found', 'One or more photos were not found');
  }

  const taskIds = rows
    .map((row) => row.workflow_task_id)
    .filter((id): id is string => Boolean(id));
  const { data: taskData, error: taskError } =
    taskIds.length === 0
      ? { data: [] as OrganizationPhotoTaskRow[], error: null }
      : await supabase
          .from('crm_workflow_tasks')
          .select('id, project_id, title, stage_slug, assigned_member_id, amount_cents')
          .eq('organization_id', organizationId)
          .in('id', [...new Set(taskIds)])
          .is('archived_at', null);
  if (taskError) throw new Error(taskError.message);
  const taskById = new Map(
    ((taskData ?? []) as OrganizationPhotoTaskRow[]).map(
      (task) => [task.id, task] as const
    )
  );
  const access = await loadOrganizationPhotoAccessContext(
    supabase,
    organizationId,
    userId
  );
  for (const row of rows) {
    const task = row.workflow_task_id ? taskById.get(row.workflow_task_id) ?? null : null;
    const permission = resolveOrganizationPhotoDocumentAccess(access, row, task);
    if (!permission.visible || !permission.canDelete) {
      throw new CrmDocumentServiceError(
        'forbidden',
        'You cannot delete one or more selected photos'
      );
    }
  }

  const results = await Promise.allSettled(
    rows.map(async (row) => {
      const project = access.projectById.get(row.project_id);
      if (!project) throw new CrmDocumentServiceError('not_found', 'Project not found');
      if (row.budget_entry_id) {
        return deleteBudgetEntryDocumentForOrg(
          supabase,
          storage,
          organizationId,
          userId,
          {
            projectSlug: project.slug,
            budgetEntryId: row.budget_entry_id,
            documentId: row.id,
          }
        );
      }
      if (row.workflow_task_id) {
        return deleteWorkflowTaskDocumentForOrg(
          supabase,
          storage,
          organizationId,
          userId,
          {
            projectSlug: project.slug,
            workflowTaskId: row.workflow_task_id,
            documentId: row.id,
          }
        );
      }
      return deleteProjectMediaDocumentForOrg(
        supabase,
        storage,
        organizationId,
        userId,
        { projectSlug: project.slug, documentId: row.id }
      );
    })
  );
  return {
    deletedCount: results.filter((result) => result.status === 'fulfilled').length,
    failedCount: results.filter((result) => result.status === 'rejected').length,
  };
}
