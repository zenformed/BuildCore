'use client';

import type { ReactElement, ReactNode } from 'react';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { useCallback, useMemo } from 'react';
import { useBuildCoreDashboard } from '@/presentation/features/buildCoreDashboard/useBuildCoreDashboard';
import { useCrmProjectDetail } from '@/presentation/features/crmProjectDetail/useCrmProjectDetail';
import { resolveProjectDetailPageContext } from '@/presentation/features/crmProjectDetail/resolveProjectDetailPageContext';
import { BuildCoreDashboardShell } from '@/presentation/components/DashboardShell/BuildCoreDashboardShell';
import { buildCoreDashboardNavigation as nav } from '@/platform/navigation/buildCoreDashboardNavigation';
import type { BuildCoreSidebarNavId } from '@/presentation/components/DashboardShell/BuildCoreSidebar';
import { ProjectDetailNotFound } from './ProjectDetailNotFound';
import { ProjectDetailPageBody } from './ProjectDetailPageBody';
import { ProjectDetailShell } from './ProjectDetailShell';
import styles from './ProjectDetail.module.css';

export type ProjectDetailRouteLayoutProps = {
  children: ReactNode;
};

export function ProjectDetailRouteLayout({ children }: ProjectDetailRouteLayoutProps): ReactElement {
  const pathname = usePathname();
  const params = useParams();
  const router = useRouter();
  const dash = useBuildCoreDashboard();
  const slug = typeof params.slug === 'string' ? params.slug : '';
  const pageContext = useMemo(
    () => resolveProjectDetailPageContext(pathname, slug),
    [pathname, slug]
  );
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
      if (id === 'reports') {
        dash.setSidebarNav('projects');
        router.push(nav.routes.reports);
        return;
      }
      goToProjects();
    },
    [dash, router, goToProjects]
  );

  let body: ReactElement;
  if (detailState.status === 'loading') {
    body = <div className={styles.pageShellLoading} aria-hidden />;
  } else if (detailState.status === 'not_found') {
    body = <ProjectDetailNotFound onBack={goToProjects} />;
  } else {
    body = (
      <ProjectDetailShell
        pageContext={pageContext}
        project={detailState.project}
        isApiSource={isApiSource}
        onBack={goToProjects}
        onOpenProject={goToProject}
        onRefresh={refetch}
      >
        <ProjectDetailPageBody pageContext={pageContext}>{children}</ProjectDetailPageBody>
      </ProjectDetailShell>
    );
  }

  return (
    <BuildCoreDashboardShell
      dash={dash}
      title={null}
      showProjectActions={false}
      sidebarActiveId="projects"
      onSidebarSelect={handleSidebarSelect}
    >
      {body}
    </BuildCoreDashboardShell>
  );
}
