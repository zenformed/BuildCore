import type { CrmDocumentMetadata, CrmProjectDetail, CrmWorkflowTask } from '@/domain/crm';
import type { AssignmentIdentityCatalog } from '@/presentation/features/crmAssignment/assignmentIdentityModel';
import { formatCentsAsUsd } from '@/presentation/features/crmProjects/crmProjectFormatters';
import { buildSendAttachmentRecipientContext } from '@/presentation/features/communications/sendAttachmentEligibility';
import type { SendAttachmentDialogContext } from '@/presentation/features/communications/sendAttachmentTypes';
import { mapCrmDocumentsToExistingAttachmentOptions } from '@/presentation/features/communications/mapExistingAttachmentOptions';

function formatPaymentEntityLabel(payment: CrmWorkflowTask): string {
  const title = payment.title.trim();
  if (title.length > 0) return title;
  return formatCentsAsUsd(payment.amountCents ?? 0);
}

export function buildPaymentSendAttachmentContext(
  project: CrmProjectDetail,
  payment: CrmWorkflowTask,
  paymentDocuments: readonly CrmDocumentMetadata[] = [],
  catalog: AssignmentIdentityCatalog | null = null
): SendAttachmentDialogContext | null {
  const recipientContext = buildSendAttachmentRecipientContext(project, catalog);
  if (recipientContext == null) return null;

  const paymentLabel = formatPaymentEntityLabel(payment);

  return {
    recipientOptions: recipientContext.recipientOptions,
    defaultRecipientId: recipientContext.defaultRecipientId,
    entity: {
      type: 'payment',
      id: payment.id,
    },
    context: {
      projectName: recipientContext.projectName,
      entityLabel: `Payment: ${paymentLabel}`,
    },
    uploadScope: {
      scope: 'workflow_task',
      projectSlug: project.summary.slug,
      workflowTaskId: payment.id,
    },
    defaultSubject: `Payment documents for ${recipientContext.projectName}`,
    existingDocuments: mapCrmDocumentsToExistingAttachmentOptions(paymentDocuments),
  };
}
