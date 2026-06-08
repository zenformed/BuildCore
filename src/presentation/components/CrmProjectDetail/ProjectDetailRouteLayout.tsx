'use client';



import type { ReactElement, ReactNode } from 'react';

import { useParams, usePathname, useRouter } from 'next/navigation';

import { useCallback, useEffect, useMemo } from 'react';

import type { CrmProjectSummary } from '@/domain/crm';

import { isBuildCoreMemberRole } from '@/domain/buildcore/memberRole';

import { buildCoreDashboardNavigation as nav } from '@/platform/navigation/buildCoreDashboardNavigation';

import {

  buildProjectDetailRoutes,

  resolveActiveProjectSlug,

} from '@/platform/navigation/projectDetailRoutes';

import { useCrmProjectDetail } from '@/presentation/features/crmProjectDetail/useCrmProjectDetail';

import { resolveProjectDetailPageContext } from '@/presentation/features/crmProjectDetail/resolveProjectDetailPageContext';

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

  const parentRouteSlug = typeof params.slug === 'string' ? params.slug : '';

  const subSlug = typeof params.subSlug === 'string' ? params.subSlug : undefined;

  const activeProjectSlug = resolveActiveProjectSlug({ parentRouteSlug, subSlug });

  const routes = useMemo(

    () => buildProjectDetailRoutes({ parentRouteSlug, subSlug }),

    [parentRouteSlug, subSlug]

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



  const goToProjects = useCallback(() => {

    router.push(nav.routes.dashboard);

  }, [router]);



  const goToProject = useCallback(() => {

    if (!parentRouteSlug) return;

    router.push(routes.detail);

  }, [parentRouteSlug, routes.detail, router]);



  const goToParentProject = useCallback(() => {

    if (!parentRouteSlug) return;

    router.push(nav.routes.projectDetail(parentRouteSlug));

  }, [parentRouteSlug, router]);



  useEffect(() => {

    if (!isMemberRole || !activeProjectSlug) return;

    if (pageContext === 'detail' || pageContext === 'workflowTasks') return;

    goToProject();

  }, [activeProjectSlug, goToProject, isMemberRole, pageContext]);



  if (detailState.status === 'loading') {

    return <div className={styles.pageShellLoading} aria-hidden />;

  }



  if (detailState.status === 'not_found') {

    return <ProjectDetailNotFound onBack={goToProjects} />;

  }



  const parentProject: CrmProjectSummary | null = detailState.parentProject ?? null;



  return (

    <ProjectDetailShell

      pageContext={pageContext}

      project={detailState.project}

      isApiSource={isApiSource}

      onBack={goToProjects}

      onOpenProject={goToProject}

      onOpenParentProject={subSlug ? goToParentProject : undefined}

      parentProject={parentProject}

      routes={routes}

      parentRouteSlug={parentRouteSlug}

      subSlug={subSlug}

      onRefresh={refetch}

    >

      <ProjectDetailPageBody pageContext={pageContext}>{children}</ProjectDetailPageBody>

    </ProjectDetailShell>

  );

}

