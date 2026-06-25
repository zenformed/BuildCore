'use client';

import Link from 'next/link';
import type { ReactElement } from 'react';
import type { CrmProjectSummary } from '@/domain/crm';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import type { ProjectDetailPageContext } from '@/presentation/features/crmProjectDetail/projectDetailPageContext';
import styles from './ProjectDetail.module.css';

export type ProjectDetailBreadcrumbNavigation = {
  readonly projectsHref: string;
  readonly parentProjectHref?: string;
  readonly parentProjectLabel?: string;
  readonly projectHref?: string;
  /** Route-aligned label while detail refetches after navigation. */
  readonly currentProjectLabel?: string;
};

export type ProjectDetailBreadcrumbNavProps = {
  readonly project: CrmProjectSummary;
  readonly parentProject?: CrmProjectSummary | null;
  readonly pageContext?: ProjectDetailPageContext;
  readonly navigation: ProjectDetailBreadcrumbNavigation;
  readonly className?: string;
};

function subPageLabel(pageContext: ProjectDetailPageContext): string | null {
  const detail = content.projectDetail;
  switch (pageContext) {
    case 'workflowTasks':
      return detail.actions.workflowTasks;
    case 'documents':
      return content.projectDetail.sections.documents;
    case 'accountability':
      return content.projectDetail.sections.accountability;
    case 'financials':
      return detail.actions.financials;
    default:
      return null;
  }
}

export function ProjectDetailBreadcrumbNav({
  project,
  parentProject = null,
  pageContext = 'detail',
  navigation,
  className,
}: ProjectDetailBreadcrumbNavProps): ReactElement {
  const detail = content.projectDetail;
  const subPage = subPageLabel(pageContext);
  const showSubPageBreadcrumb = subPage != null && navigation.projectHref != null;
  const showParentBreadcrumb = navigation.parentProjectHref != null;
  const parentLabel =
    navigation.parentProjectLabel?.trim() ||
    parentProject?.name.trim() ||
    '';
  const projectLabel = navigation.currentProjectLabel?.trim() || project.name;

  const navClassName = className ?? styles.breadcrumb;

  return (
    <nav className={navClassName} aria-label="Breadcrumb">
      <span className={styles.breadcrumbMuted}>{detail.breadcrumbCrm}</span>
      <span className={styles.breadcrumbSep} aria-hidden>
        /
      </span>
      <Link href={navigation.projectsHref} className={styles.breadcrumbLink} prefetch={false}>
        {detail.breadcrumbProjects}
      </Link>
      <span className={styles.breadcrumbSep} aria-hidden>
        /
      </span>
      {showParentBreadcrumb && parentLabel.length > 0 ? (
        <>
          <Link
            href={navigation.parentProjectHref!}
            className={styles.breadcrumbLink}
            prefetch={false}
          >
            {parentLabel}
          </Link>
          <span className={styles.breadcrumbSep} aria-hidden>
            /
          </span>
        </>
      ) : null}
      {showSubPageBreadcrumb ? (
        <>
          <Link href={navigation.projectHref!} className={styles.breadcrumbLink} prefetch={false}>
            {projectLabel}
          </Link>
          <span className={styles.breadcrumbSep} aria-hidden>
            /
          </span>
          <span className={styles.breadcrumbCurrent} aria-current="page">
            {subPage}
          </span>
        </>
      ) : (
        <span className={styles.breadcrumbCurrent} aria-current="page">
          {projectLabel}
        </span>
      )}
    </nav>
  );
}
