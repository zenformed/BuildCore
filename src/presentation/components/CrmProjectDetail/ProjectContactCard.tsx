'use client';

import type { ReactElement } from 'react';
import type { CrmProjectDetail } from '@/domain/crm';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { formatRelativeUpdatedAt } from '@/presentation/features/crmProjects/crmProjectFormatters';
import { useProjectDetailShell } from '@/presentation/features/crmProjectDetail/ProjectDetailShellContext';
import { CrmCustomerContactPanel } from '@/presentation/components/crmShared/CrmCustomerContactPanel';

export type ProjectContactCardProps = {
  project: CrmProjectDetail;
};

export function ProjectContactCard({ project }: ProjectContactCardProps): ReactElement {
  const { summary, notes } = project;
  const { isMemberRole } = useProjectDetailShell();

  return (
    <CrmCustomerContactPanel
      headingId="project-contact-heading"
      heading={content.projectDetail.sections.contact}
      customerName={summary.client.name}
      contact={summary.contact}
      maskForMember={isMemberRole}
      assignedDisplay={summary.assignedTo?.displayName ?? content.projectDetail.unassigned}
      updatedDisplay={formatRelativeUpdatedAt(summary.lastUpdatedAt)}
      notes={notes}
    />
  );
}
