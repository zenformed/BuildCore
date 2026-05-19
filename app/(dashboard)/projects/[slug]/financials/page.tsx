'use client';

import type { ReactElement } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { useBuildCoreDashboard } from '@/presentation/features/buildCoreDashboard/useBuildCoreDashboard';
import { useCrmProjectDetail } from '@/presentation/features/crmProjectDetail/useCrmProjectDetail';
import { BuildCoreDashboardShell } from '@/presentation/components/DashboardShell/BuildCoreDashboardShell';
import { ProjectDetailNotFound } from '@/presentation/components/CrmProjectDetail/ProjectDetailNotFound';
import { ProjectFinancialsPage } from '@/presentation/components/CrmProjectDetail/ProjectFinancialsPage';
import { buildCoreDashboardNavigation as nav } from '@/platform/navigation/buildCoreDashboardNavigation';
import type { BuildCoreSidebarNavId } from '@/presentation/components/DashboardShell/BuildCoreSidebar';

export default function ProjectFinancialsRoutePage(): ReactElement {
  const params = useParams();
  const router = useRouter();
  const dash = useBuildCoreDashboard();
  const slug = typeof params.slug === 'string' ? params.slug : '';
  const { state: detailState, refetch, isApiSource } = useCrmProjectDetail(slug);

  const goToProjects = useCallback(() => {
    router.push(nav.routes.dashboard);
  }, [router]);

  const goToProject = useCallback(() => {
    if (!slug) return;
    router.push(nav.routes.projectDetail(slug));
  }, [router, slug]);

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
        <ProjectFinancialsPage
          project={detailState.project}
          isApiSource={isApiSource}
          onBack={goToProjects}
          onOpenProject={goToProject}
          onRefresh={refetch}
        />
      ) : detailState.status === 'loading' ? null : (
        <ProjectDetailNotFound onBack={goToProjects} />
      )}
    </BuildCoreDashboardShell>
  );
}
