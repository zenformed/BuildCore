import type { CrmDocumentMetadata, CrmWorkflowTask } from '@/domain/crm';
import { isPaymentWorkflowTask } from '@/domain/crm/paymentWorkflow';
import type { BuildCorePermissionDomain } from '@/domain/buildcore/rolePermissions';

/** Maps a stored document to a task/payment/budget permission domain. Project media is CRM-scoped. */
export function resolveCrmDocumentDownloadPermissionDomain(
  doc: Pick<CrmDocumentMetadata, 'workflowTaskId' | 'budgetEntryId'>,
  task: Pick<CrmWorkflowTask, 'amountCents'> | undefined
): BuildCorePermissionDomain | null {
  if (doc.budgetEntryId != null) {
    return 'budget';
  }
  if (doc.workflowTaskId != null) {
    if (task != null && isPaymentWorkflowTask(task)) {
      return 'payments';
    }
    return 'workflow_tasks';
  }
  return null;
}
