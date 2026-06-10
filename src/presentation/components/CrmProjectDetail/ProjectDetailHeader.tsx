'use client';

import type { ReactElement, ReactNode } from 'react';
import type { CrmProjectSummary } from '@/domain/crm';
import { isCrmProjectComplete } from '@/domain/crm';
import { CrmProjectCompleteIcon } from '@/presentation/components/crmShared/CrmProjectCompleteIcon';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import type { ProjectDetailPageContext } from '@/presentation/features/crmProjectDetail/projectDetailPageContext';
import { ProjectPrimaryPhoto } from './ProjectPrimaryPhoto';
import styles from './ProjectDetail.module.css';

export type ProjectDetailHeaderProps = {
  project: CrmProjectSummary;
  parentProject?: CrmProjectSummary | null;
  pageContext?: ProjectDetailPageContext;
  onBack: () => void;
  onOpenProject?: () => void;
  onOpenParentProject?: () => void;
  assigneeControl?: ReactNode;
  tradeTypeControl?: ReactNode;
  /** @deprecated Use industryControl */
  industryControl?: ReactNode;
  actions?: ReactNode;
  progress?: ReactNode;
  onPrimaryPhotoUpdated?: (summary: CrmProjectSummary) => void;
  onPrimaryPhotoError?: (message: string) => void;
  canEditPrimaryPhoto?: boolean;
};

export function ProjectDetailHeader({
  project,
  parentProject = null,
  pageContext = 'detail',
  onBack,
  onOpenProject,
  onOpenParentProject,
  assigneeControl,
  tradeTypeControl,
  industryControl,
  actions,
  progress,
  onPrimaryPhotoUpdated,
  onPrimaryPhotoError,
  canEditPrimaryPhoto = false,
}: ProjectDetailHeaderProps): ReactElement {
  const detail = content.projectDetail;
  const subPageLabel =
    pageContext === 'workflowTasks'
      ? detail.actions.workflowTasks
      : pageContext === 'documents'
        ? content.projectDetail.sections.documents
        : pageContext === 'accountability'
          ? content.projectDetail.sections.accountability
          : pageContext === 'financials'
            ? content.projectDetail.actions.financials
            : null;
  const showSubPageBreadcrumb = subPageLabel != null && onOpenProject != null;
  const showParentBreadcrumb = parentProject != null && onOpenParentProject != null;
  const isComplete = isCrmProjectComplete(project);

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
            {showParentBreadcrumb ? (
              <>
                <button type="button" className={styles.breadcrumbLink} onClick={onOpenParentProject}>
                  {parentProject.name}
                </button>
                <span className={styles.breadcrumbSep} aria-hidden>
                  /
                </span>
              </>
            ) : null}
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
          <div className={styles.titleBlockBody}>
            <ProjectPrimaryPhoto
              summary={project}
              parentSummary={parentProject}
              canEdit={canEditPrimaryPhoto && project.parentProjectId == null}
              onPhotoUpdated={(summary) => onPrimaryPhotoUpdated?.(summary)}
              onError={onPrimaryPhotoError}
            />
            <div className={styles.titleBlockContent}>
              <div className={styles.titleRow}>
                {isComplete ? (
                  <CrmProjectCompleteIcon ariaLabel={content.crm.table.completionCheckAriaLabel} />
                ) : null}
                <h1 className={styles.title}>{project.client.name}</h1>
                {assigneeControl}
              </div>
              {industryControl ?? tradeTypeControl}
              {progress ? <div className={styles.titleBlockProgress}>{progress}</div> : null}
            </div>
          </div>
        </div>
      </div>
      {actions ? <div className={styles.detailHeaderActions}>{actions}</div> : null}
    </header>
  );
}
