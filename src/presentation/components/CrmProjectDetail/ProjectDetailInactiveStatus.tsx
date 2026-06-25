'use client';

import type { ReactElement } from 'react';
import type { CrmProjectSummary } from '@/domain/crm';
import { isCrmProjectInactive } from '@/domain/crm';
import { CrmProjectInactiveInlineLabel } from '@/presentation/components/CrmProjects/CrmProjectInactiveBadge';

export type ProjectDetailInactiveStatusProps = {
  readonly project: CrmProjectSummary;
};

export function ProjectDetailInactiveStatus({
  project,
}: ProjectDetailInactiveStatusProps): ReactElement | null {
  if (project.parentProjectId == null || !isCrmProjectInactive(project)) {
    return null;
  }

  return <CrmProjectInactiveInlineLabel project={project} />;
}
