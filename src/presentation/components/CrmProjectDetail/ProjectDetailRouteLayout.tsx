'use client';

import type { ReactElement, ReactNode } from 'react';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo } from 'react';
import { isBuildCoreMemberRole } from '@/domain/buildcore/memberRole';
import { useCrmProjectDetail } from '@/presentation/features/crmProjectDetail/useCrmProjectDetail';
import { resolveProjectDetailPageContext } from '@/presentation/features/crmProjectDetail/resolveProjectDetailPageContext';
import { buildCoreDashboardNavigation as nav } from '@/platform/navigation/buildCoreDashboardNavigation';
import { useSaaSProfile } from '@/presentation/hooks/useSaaSProfile';
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
  const slug = typeof params.slug === 'string' ? params.slug : '';
  const pageContext = useMemo(
    () => resolveProjectDetailPageContext(pathname, slug),
    [pathname, slug]
  );
  const { state: detailState, refetch, isApiSource } = useCrmProjectDetail(slug);
  const { organizationMembershipContext } = useSaaSProfile();
  const isMemberRole = isBuildCoreMemberRole(organizationMembershipContext?.role);

  const goToProjects = useCallback(() => {
    router.push(nav.routes.dashboard);
  }, [router]);

  const goToProject = useCallback(() => {
    if (!slug) return;
    router.push(nav.routes.projectDetail(slug));
  }, [router, slug]);

  useEffect(() => {
    if (!isMemberRole || !slug) return;
    if (pageContext === 'detail' || pageContext === 'workflowTasks') return;
    goToProject();
  }, [goToProject, isMemberRole, pageContext, slug]);

  if (detailState.status === 'loading') {
    return <div className={styles.pageShellLoading} aria-hidden />;
  }

  if (detailState.status === 'not_found') {
    return <ProjectDetailNotFound onBack={goToProjects} />;
  }

  return (
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
