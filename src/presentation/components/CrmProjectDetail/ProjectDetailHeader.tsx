'use client';

import type { ReactElement, ReactNode } from 'react';
import type { CrmProjectSummary } from '@/domain/crm';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import type { ProjectDetailPageContext } from './ProjectDetailContextBlock';
import styles from './ProjectDetail.module.css';

export type ProjectDetailHeaderProps = {
  project: CrmProjectSummary;
  pageContext?: ProjectDetailPageContext;
  onBack: () => void;
  onOpenProject?: () => void;
  assigneeControl?: ReactNode;
  tradeTypeControl?: ReactNode;
  actions?: ReactNode;
};

export function ProjectDetailHeader({
  project,
  pageContext = 'detail',
  onBack,
  onOpenProject,
  assigneeControl,
  tradeTypeControl,
  actions,
}: ProjectDetailHeaderProps): ReactElement {
  const detail = content.projectDetail;
  const subPageLabel =
    pageContext === 'workflowTasks'
      ? detail.actions.workflowTasks
      : pageContext === 'documents'
        ? content.projectDetail.sections.documents
        : pageContext === 'accountability'
          ? content.projectDetail.sections.accountability
          : null;
  const showSubPageBreadcrumb = subPageLabel != null && onOpenProject != null;

  return (
    <header className={styles.detailHeader}>
      <div className={styles.detailHeaderMain}>
        <div className={styles.titleBlock}>
          <nav className={styles.breadcrumb} aria-label="Breadcrumb">
            <span className={styles.breadcrumbMuted}>{detail.breadcrumbCrm}</span>
            <span className={styles.breadcrumbSep} aria-hidden>
              /
            </span>
            <button type="button" className={styles.breadcrumbLink} onClick={onBack}>
              {detail.breadcrumbProjects}
            </button>
            <span className={styles.breadcrumbSep} aria-hidden>
              /
            </span>
            {showSubPageBreadcrumb ? (
              <>
                <button type="button" className={styles.breadcrumbLink} onClick={onOpenProject}>
                  {project.name}
                </button>
                <span className={styles.breadcrumbSep} aria-hidden>
                  /
                </span>
                <span className={styles.breadcrumbCurrent}>{subPageLabel}</span>
              </>
            ) : (
              <span className={styles.breadcrumbCurrent}>{project.name}</span>
            )}
          </nav>
          <div className={styles.titleRow}>
            <h1 className={styles.title}>{project.name}</h1>
            {assigneeControl}
          </div>
          {tradeTypeControl}
        </div>
      </div>
      {actions ? <div className={styles.detailHeaderActions}>{actions}</div> : null}
    </header>
  );
}
