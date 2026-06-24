import type { CrmProjectDetail } from '@/domain/crm';
import type { AssignmentIdentityCatalog } from '@/presentation/features/crmAssignment/assignmentIdentityModel';
import { buildCommunicationRecipientOptionsFromCatalog } from '@/presentation/features/communications/buildCommunicationRecipientOptions';
import {
  defaultCommunicationRecipientId,
  type CommunicationRecipientOption,
} from '@/presentation/features/communications/communicationRecipientTypes';

export type SendAttachmentRecipientContext = {
  readonly recipientOptions: readonly CommunicationRecipientOption[];
  readonly defaultRecipientId: string;
  readonly projectName: string;
};

export function buildSendAttachmentRecipientContext(
  project: Pick<CrmProjectDetail, 'summary'>,
  catalog: AssignmentIdentityCatalog | null
): SendAttachmentRecipientContext | null {
  const recipientOptions = buildCommunicationRecipientOptionsFromCatalog({
    customer: project.summary.contact,
    catalog,
  });
  const defaultRecipientId = defaultCommunicationRecipientId(recipientOptions);
  if (defaultRecipientId == null) return null;

  return {
    recipientOptions,
    defaultRecipientId,
    projectName: project.summary.name.trim() || 'Project',
  };
}

export function projectSupportsSendAttachment(
  project: Pick<CrmProjectDetail, 'summary'>,
  catalog: AssignmentIdentityCatalog | null,
  isApiSource: boolean
): boolean {
  if (!isApiSource) return false;
  return buildSendAttachmentRecipientContext(project, catalog) != null;
}
