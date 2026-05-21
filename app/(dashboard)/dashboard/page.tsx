'use client';

import type { ReactElement } from 'react';
import { useRouter } from 'next/navigation';
import { buildCoreDashboardNavigation as nav } from '@/platform/navigation/buildCoreDashboardNavigation';
import type { BuildCoreSidebarNavId } from '@/presentation/components/DashboardShell/BuildCoreSidebar';
import { useBuildCoreDashboard } from '@/presentation/features/buildCoreDashboard/useBuildCoreDashboard';
import { BuildCoreDashboardShell } from '@/presentation/components/DashboardShell/BuildCoreDashboardShell';
import { CrmProjectsPipeline } from '@/presentation/components/CrmProjects/CrmProjectsPipeline';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import localStyles from './buildCoreDashboard.module.css';

export default function DashboardPage(): ReactElement {
  const dash = useBuildCoreDashboard();
  const router = useRouter();
  const showProjects = dash.sidebarNav === 'projects';

  const onSidebarSelect = (id: BuildCoreSidebarNavId): void => {
    if (id === 'reports') {
      router.push(nav.routes.reports);
      return;
    }
    dash.setSidebarNav(id);
  };

  return (
    <BuildCoreDashboardShell
      dash={dash}
      title={showProjects ? content.dashboard.title : content.dashboard.overviewTitle}
      showProjectActions={showProjects}
      onSidebarSelect={onSidebarSelect}
    >
      {showProjects ? (
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
      ) : (
        <p className={localStyles.overviewMessage}>{content.dashboard.overviewBody}</p>
      )}
    </BuildCoreDashboardShell>
  );
}
