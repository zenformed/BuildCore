import type { CrmBudgetEntry, CrmDocumentMetadata, CrmProjectDetail } from '@/domain/crm';
import type { AssignmentIdentityCatalog } from '@/presentation/features/crmAssignment/assignmentIdentityModel';
import { formatBudgetCategory } from '@/presentation/features/crmProjectDetail/budgetCategoryLabels';
import { buildSendAttachmentRecipientContext } from '@/presentation/features/communications/sendAttachmentEligibility';
import type { SendAttachmentDialogContext } from '@/presentation/features/communications/sendAttachmentTypes';
import { mapCrmDocumentsToExistingAttachmentOptions } from '@/presentation/features/communications/mapExistingAttachmentOptions';

function formatBudgetEntityLabel(entry: CrmBudgetEntry): string {
  const itemName = entry.itemName.trim();
  if (itemName.length > 0) return itemName;
  return formatBudgetCategory(entry.category);
}

export function buildBudgetEntrySendAttachmentContext(
  project: CrmProjectDetail,
  entry: CrmBudgetEntry,
  entryDocuments: readonly CrmDocumentMetadata[] = [],
  catalog: AssignmentIdentityCatalog | null = null
): SendAttachmentDialogContext | null {
  const recipientContext = buildSendAttachmentRecipientContext(project, catalog);
  if (recipientContext == null) return null;

  const budgetLabel = formatBudgetEntityLabel(entry);

  return {
    recipientOptions: recipientContext.recipientOptions,
    defaultRecipientId: recipientContext.defaultRecipientId,
    entity: {
      type: 'budget_entry',
      id: entry.id,
    },
    context: {
      projectName: recipientContext.projectName,
      entityLabel: `Budget: ${budgetLabel}`,
    },
    uploadScope: {
      scope: 'budget_entry',
      projectSlug: project.summary.slug,
      budgetEntryId: entry.id,
    },
    defaultSubject: `Budget documents for ${recipientContext.projectName}`,
    existingDocuments: mapCrmDocumentsToExistingAttachmentOptions(entryDocuments),
  };
}
