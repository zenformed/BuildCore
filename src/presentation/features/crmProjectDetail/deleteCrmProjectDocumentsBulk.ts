import type { CrmDocumentMetadata } from '@/domain/crm';
import { CRM_DOCUMENTS_LIST_V2_BULK_MAX_IDS } from '@/domain/crm/documentsListV2';
import { deleteBudgetEntryDocument } from '@/application/use-cases/crm/deleteBudgetEntryDocument';
import { deleteProjectMediaDocument } from '@/application/use-cases/crm/deleteProjectMediaDocument';
import { deleteWorkflowTaskDocument } from '@/application/use-cases/crm/deleteWorkflowTaskDocument';
import type { CrmRepositories } from '@/application/ports/crm';

/**
 * Deletes many project documents in parallel (workflow / budget / media targets).
 * Does not refresh project detail — caller should update UI optimistically.
 * Max explicit IDs: CRM_DOCUMENTS_LIST_V2_BULK_MAX_IDS (Phase 1A).
 */
export async function deleteCrmProjectDocumentsBulk(
  repositories: CrmRepositories,
  projectSlug: string,
  documents: readonly CrmDocumentMetadata[]
): Promise<{ readonly deletedCount: number; readonly failedCount: number }> {
  if (documents.length === 0) {
    return { deletedCount: 0, failedCount: 0 };
  }
  if (documents.length > CRM_DOCUMENTS_LIST_V2_BULK_MAX_IDS) {
    throw new Error(`Select at most ${CRM_DOCUMENTS_LIST_V2_BULK_MAX_IDS} documents`);
  }

  const results = await Promise.allSettled(
    documents.map(async (doc) => {
      if (doc.budgetEntryId) {
        await deleteBudgetEntryDocument(repositories, {
          projectSlug,
          budgetEntryId: doc.budgetEntryId,
          documentId: doc.id,
        });
        return;
      }
      if (doc.workflowTaskId) {
        await deleteWorkflowTaskDocument(repositories, {
          projectSlug,
          workflowTaskId: doc.workflowTaskId,
          documentId: doc.id,
        });
        return;
      }
      await deleteProjectMediaDocument(repositories, {
        projectSlug,
        documentId: doc.id,
      });
    })
  );

  let deletedCount = 0;
  let failedCount = 0;
  for (const result of results) {
    if (result.status === 'fulfilled') deletedCount += 1;
    else failedCount += 1;
  }
  return { deletedCount, failedCount };
}
