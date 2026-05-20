'use client';

import type { ReactElement, ReactNode } from 'react';
import type { ProjectDetailPageContext } from '@/presentation/features/crmProjectDetail/projectDetailPageContext';
import styles from './ProjectDetail.module.css';

function bodyClassName(pageContext: ProjectDetailPageContext): string {
  return pageContext === 'detail' ? styles.pageBodyOverview : styles.pageBodySubpage;
}

function bodyDataAttributes(
  pageContext: ProjectDetailPageContext
): Record<string, string | undefined> {
  switch (pageContext) {
    case 'detail':
      return { 'data-project-detail-page': '' };
    case 'workflowTasks':
      return { 'data-project-tasks-page': '' };
    case 'financials':
      return { 'data-project-financials-page': '' };
    case 'documents':
      return { 'data-project-documents-page': '' };
    case 'accountability':
      return { 'data-project-accountability-page': '' };
    default:
      return {};
  }
}

export type ProjectDetailPageBodyProps = {
  pageContext: ProjectDetailPageContext;
  children: ReactNode;
};

export function ProjectDetailPageBody({
  pageContext,
  children,
}: ProjectDetailPageBodyProps): ReactElement {
  return (
    <div className={bodyClassName(pageContext)} {...bodyDataAttributes(pageContext)}>
      {children}
    </div>
  );
}
