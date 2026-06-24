import type { CrmDocumentMetadata, CrmProjectDetail, CrmWorkflowTask } from '@/domain/crm';
import type { AssignmentIdentityCatalog } from '@/presentation/features/crmAssignment/assignmentIdentityModel';
import { buildCommunicationRecipientOptionsFromCatalog } from '@/presentation/features/communications/buildCommunicationRecipientOptions';
import { defaultCommunicationRecipientId } from '@/presentation/features/communications/communicationRecipientTypes';
import type { SendAttachmentDialogContext } from '@/presentation/features/communications/sendAttachmentTypes';
import { mapCrmDocumentsToExistingAttachmentOptions } from '@/presentation/features/communications/mapExistingAttachmentOptions';

export function workflowTaskSupportsSendAttachment(
  project: Pick<CrmProjectDetail, 'summary'>,
  isApiSource: boolean
): boolean {
  if (!isApiSource) return false;
  return (project.summary.contact.email?.trim() ?? '').length > 0;
}

export function buildWorkflowTaskSendAttachmentContext(
  project: CrmProjectDetail,
  task: CrmWorkflowTask,
  taskDocuments: readonly CrmDocumentMetadata[] = [],
  catalog: AssignmentIdentityCatalog | null = null
): SendAttachmentDialogContext | null {
  const recipientOptions = buildCommunicationRecipientOptionsFromCatalog({
    customer: project.summary.contact,
    catalog,
  });
  const defaultRecipientId = defaultCommunicationRecipientId(recipientOptions);
  if (defaultRecipientId == null) return null;

  const projectName = project.summary.name.trim() || 'Project';
  const entityLabel = task.title.trim() || 'Task';

  return {
    recipientOptions,
    defaultRecipientId,
    entity: {
      type: 'workflow_task',
      id: task.id,
    },
    context: {
      projectName,
      entityLabel,
    },
    uploadScope: {
      scope: 'workflow_task',
      projectSlug: project.summary.slug,
      workflowTaskId: task.id,
    },
    defaultSubject: `Documents for ${projectName}`,
    existingDocuments: mapCrmDocumentsToExistingAttachmentOptions(taskDocuments),
  };
}
