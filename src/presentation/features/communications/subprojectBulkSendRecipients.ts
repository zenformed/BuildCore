import type { CrmProjectSummary } from '@/domain/crm';
import { getBuildCoreDashboardContent } from '@/platform/content/buildCoreDashboardContent';

export type BulkSubprojectSendRecipientStatus = 'ready' | 'missing_email';

export type BulkSubprojectSendRecipient = {
  readonly subprojectId: string;
  readonly subprojectName: string;
  readonly contactName: string;
  readonly email: string | null;
  readonly contactId: string | null;
  readonly status: BulkSubprojectSendRecipientStatus;
};

export type BulkSubprojectSendRecipientSummary = {
  readonly recipients: readonly BulkSubprojectSendRecipient[];
  readonly selectedCount: number;
  readonly readyCount: number;
  readonly skippedCount: number;
};

export function resolveBulkSubprojectSendRecipients(
  subprojects: readonly CrmProjectSummary[]
): BulkSubprojectSendRecipientSummary {
  const recipients = subprojects.map((subproject): BulkSubprojectSendRecipient => {
    const email = subproject.contact.email?.trim() ?? '';
    const contactName = subproject.contact.name.trim() || 'Customer';
    return {
      subprojectId: subproject.id,
      subprojectName:
        subproject.name.trim() ||
        getBuildCoreDashboardContent().projectDetail.subprojects.projectColumn,
      contactName,
      email: email.length > 0 ? email : null,
      contactId: subproject.contact.id,
      status: email.length > 0 ? 'ready' : 'missing_email',
    };
  });

  const readyCount = recipients.filter((recipient) => recipient.status === 'ready').length;

  return {
    recipients,
    selectedCount: recipients.length,
    readyCount,
    skippedCount: recipients.length - readyCount,
  };
}

export function buildBulkSubprojectSendDefaultSubject(parentProjectName: string): string {
  const content = getBuildCoreDashboardContent();
  const name = parentProjectName.trim() || content.projectDetail.pageTitleFallback;
  return `Documents for ${name} ${content.projectDetail.subprojects.subprojectPlural}`;
}
