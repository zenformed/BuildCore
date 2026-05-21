'use client';

import type { ReactElement } from 'react';
import { useBuildCoreDashboardContext } from '@/presentation/providers/BuildCoreDashboardProvider';
import { CrmProjectsPipeline } from '@/presentation/components/CrmProjects/CrmProjectsPipeline';

export default function DashboardPage(): ReactElement {
  const dash = useBuildCoreDashboardContext();

  return (
    <CrmProjectsPipeline
      searchQuery={dash.projectsSearchQuery}
      stageFilter={dash.stageFilter}
      priorityFilter={dash.priorityFilter}
      createDraftOpen={dash.createProjectDraftOpen}
      onCreateDraftOpenChange={dash.setCreateProjectDraftOpen}
      onStageFilterChange={dash.setStageFilter}
      onPriorityFilterChange={dash.setPriorityFilter}
      onProjectRowClick={dash.onProjectRowClick}
    />
  );
}
