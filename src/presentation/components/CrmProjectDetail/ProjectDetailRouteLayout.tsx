'use client';

import type { ReactElement, ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { CrmProjectSummary } from '@/domain/crm';
import { isBuildCoreMemberRole } from '@/domain/buildcore/memberRole';
import { useBuildCoreNavigation } from '@/presentation/providers/BuildCoreNavigationProvider';
import { parseProjectDetailPathname } from '@/platform/navigation/parseProjectDetailPathname';
import { resolveProjectDetailBreadcrumbCurrentLabel } from '@/platform/navigation/resolveProjectDetailBreadcrumbLabels';
import { resolveActiveProjectSlug } from '@/platform/navigation/projectDetailRoutes';
import { useCrmProjectDetail } from '@/presentation/features/crmProjectDetail/useCrmProjectDetail';
import type { CrmProjectDetailState } from '@/presentation/features/crmProjectDetail/useCrmProjectDetail';
import { resolveProjectDetailPageContext } from '@/presentation/features/crmProjectDetail/resolveProjectDetailPageContext';
import { useSaaSProfile } from '@/presentation/hooks/useSaaSProfile';
import type { ProjectDetailBreadcrumbNavigation } from '@/presentation/components/CrmProjectDetail/ProjectDetailBreadcrumbNav';
import { ProjectDetailNotFound } from './ProjectDetailNotFound';
import { ProjectDetailPageBody } from './ProjectDetailPageBody';
import { ProjectDetailShell } from './ProjectDetailShell';
import styles from './ProjectDetail.module.css';

export type ProjectDetailRouteLayoutProps = {
  children: ReactNode;
};

type ReadyDetailState = Extract<CrmProjectDetailState, { status: 'ready' }>;

export function ProjectDetailRouteLayout({ children }: ProjectDetailRouteLayoutProps): ReactElement {
  const pathname = usePathname();
  const router = useRouter();
  const nav = useBuildCoreNavigation();
  const routeIdentity = useMemo(() => parseProjectDetailPathname(pathname), [pathname]);
  const { parentRouteSlug, subSlug } = routeIdentity;
  const activeProjectSlug = resolveActiveProjectSlug(routeIdentity);
  const routes = useMemo(
    () => nav.routes.projectRoutes(routeIdentity),
    [nav, routeIdentity]
  );
  const pageContext = useMemo(
    () => resolveProjectDetailPageContext(pathname, parentRouteSlug, subSlug),
    [pathname, parentRouteSlug, subSlug]
  );
  const { state: detailState, refetch, isApiSource } = useCrmProjectDetail(activeProjectSlug, {
    parentSlug: subSlug ? parentRouteSlug : undefined,
  });
  const { organizationMembershipContext } = useSaaSProfile();
  const isMemberRole = isBuildCoreMemberRole(organizationMembershipContext?.role);
  const lastReadyRef = useRef<ReadyDetailState | null>(null);

  useEffect(() => {
    if (detailState.status === 'ready') {
      lastReadyRef.current = detailState;
    }
  }, [detailState]);

  const goToProjects = useCallback(() => {
    router.push(nav.routes.dashboard);
  }, [nav.routes.dashboard, router]);

  const goToProject = useCallback(() => {
    if (!parentRouteSlug) return;
    router.push(routes.detail);
  }, [parentRouteSlug, routes.detail, router]);

  useEffect(() => {
    if (!isMemberRole || !activeProjectSlug) return;
    if (subSlug != null && subSlug.length > 0 && parentRouteSlug.length > 0) {
      router.replace(nav.routes.projectDetail(parentRouteSlug));
      return;
    }
    if (pageContext === 'detail' || pageContext === 'workflowTasks') return;
    goToProject();
  }, [
    activeProjectSlug,
    goToProject,
    isMemberRole,
    nav.routes.projectDetail,
    pageContext,
    parentRouteSlug,
    router,
    subSlug,
  ]);

  const shellState: ReadyDetailState | null =
    detailState.status === 'ready' ? detailState : lastReadyRef.current;

  const parentProject: CrmProjectSummary | null = shellState?.parentProject ?? null;

  const isRefreshing = detailState.status === 'loading';

  const breadcrumbNavigation = useMemo((): ProjectDetailBreadcrumbNavigation => {
    const parentSlug = parentProject?.slug ?? parentRouteSlug;
    const parentHref =
      subSlug != null && subSlug.length > 0 && parentRouteSlug.length > 0
        ? nav.routes.projectDetail(parentSlug)
        : undefined;

    const currentProjectLabel = resolveProjectDetailBreadcrumbCurrentLabel({
      parentRouteSlug,
      subSlug,
      parentProject,
      detailReady: detailState.status === 'ready' ? detailState.project : null,
      staleProject: shellState?.project ?? null,
      isRefreshing,
    });

    return {
      projectsHref: nav.routes.dashboard,
      parentProjectHref: parentHref,
      parentProjectLabel:
        parentProject?.name ??
        (subSlug != null && subSlug.length > 0 ? parentRouteSlug : undefined),
      projectHref: pageContext !== 'detail' ? routes.detail : undefined,
      currentProjectLabel,
    };
  }, [
    detailState,
    isRefreshing,
    nav.routes.dashboard,
    nav.routes.projectDetail,
    pageContext,
    parentProject,
    parentRouteSlug,
    routes.detail,
    shellState?.project,
    subSlug,
  ]);

  if (detailState.status === 'not_found') {
    return <ProjectDetailNotFound onBack={goToProjects} />;
  }

  if (shellState == null) {
    return <div className={styles.pageShellLoading} aria-busy="true" />;
  }

  return (
    <ProjectDetailShell
      pageContext={pageContext}
      project={shellState.project}
      isApiSource={isApiSource}
      breadcrumbNavigation={breadcrumbNavigation}
      parentProject={parentProject}
      routes={routes}
      parentRouteSlug={parentRouteSlug}
      subSlug={subSlug}
      onRefresh={refetch}
    >
      {isRefreshing ? <div className={styles.pageShellBodyRefreshing} aria-busy="true" /> : null}
      <ProjectDetailPageBody pageContext={pageContext}>{children}</ProjectDetailPageBody>
    </ProjectDetailShell>
  );
}
