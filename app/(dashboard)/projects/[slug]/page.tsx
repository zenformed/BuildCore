'use client';

import type { ReactElement } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { useBuildCoreDashboard } from '@/presentation/features/buildCoreDashboard/useBuildCoreDashboard';
import { useCrmProjectDetail } from '@/presentation/features/crmProjectDetail/useCrmProjectDetail';
import { BuildCoreDashboardShell } from '@/presentation/components/DashboardShell/BuildCoreDashboardShell';
import { ProjectDetailNotFound } from '@/presentation/components/CrmProjectDetail/ProjectDetailNotFound';
import { ProjectDetailPage } from '@/presentation/components/CrmProjectDetail/ProjectDetailPage';
import { buildCoreDashboardNavigation as nav } from '@/platform/navigation/buildCoreDashboardNavigation';
import type { BuildCoreSidebarNavId } from '@/presentation/components/DashboardShell/BuildCoreSidebar';

export default function ProjectDetailRoutePage(): ReactElement {
  const params = useParams();
  const router = useRouter();
  const dash = useBuildCoreDashboard();
  const slug = typeof params.slug === 'string' ? params.slug : '';
  const detailState = useCrmProjectDetail(slug);

  const goToProjects = useCallback(() => {
    router.push(nav.routes.dashboard);
  }, [router]);

  const handleSidebarSelect = useCallback(
    (id: BuildCoreSidebarNavId) => {
      if (id === 'projects') {
        goToProjects();
        return;
      }
      dash.setSidebarNav(id);
      goToProjects();
    },
    [dash, goToProjects]
  );

  return (
    <BuildCoreDashboardShell
      dash={dash}
      title={null}
      showProjectActions={false}
      sidebarActiveId="projects"
      onSidebarSelect={handleSidebarSelect}
    >
      {detailState.status === 'ready' ? (
        <ProjectDetailPage project={detailState.project} onBack={goToProjects} />
      ) : (
        <ProjectDetailNotFound onBack={goToProjects} />
      )}
    </BuildCoreDashboardShell>
  );
}
