'use client';

import type { ReactElement, ReactNode } from 'react';
import type { CrmProjectSummary, CrmProjectStageCompletion, CrmWorkflowTask } from '@/domain/crm';
import { isCrmProjectComplete } from '@/domain/crm';
import { CrmProjectCompleteIcon } from '@/presentation/components/crmShared/CrmProjectCompleteIcon';
import { CrmProjectInactiveIcon } from '@/presentation/components/CrmProjects/CrmProjectInactiveBadge';
import { isCrmProjectInactive } from '@/domain/crm';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import type { ProjectDetailPageContext } from '@/presentation/features/crmProjectDetail/projectDetailPageContext';
import { useDashboardMobileLayout } from '@/presentation/features/crmProjects/useDashboardMobileLayout';
import {
  ProjectDetailBreadcrumbNav,
  type ProjectDetailBreadcrumbNavigation,
} from './ProjectDetailBreadcrumbNav';
import { ProjectPrimaryPhoto } from './ProjectPrimaryPhoto';
import {
  ProjectDetailMobileHeaderProgress,
} from './ProjectDetailMobileStageSummary';
import { ProjectDetailInactiveStatus } from './ProjectDetailInactiveStatus';
import styles from './ProjectDetail.module.css';

export type ProjectDetailHeaderProps = {
  project: CrmProjectSummary;
  parentProject?: CrmProjectSummary | null;
  pageContext?: ProjectDetailPageContext;
  breadcrumbNavigation: ProjectDetailBreadcrumbNavigation;
  assigneeControl?: ReactNode;
  tradeTypeControl?: ReactNode;
  /** @deprecated Use industryControl */
  industryControl?: ReactNode;
  actions?: ReactNode;
  progress?: ReactNode;
  onPrimaryPhotoUpdated?: (summary: CrmProjectSummary) => void;
  onPrimaryPhotoError?: (message: string) => void;
  canEditPrimaryPhoto?: boolean;
  mobileStageWorkflowTasks?: readonly CrmWorkflowTask[];
  mobileStageCompletions?: readonly CrmProjectStageCompletion[];
};

export function ProjectDetailHeader({
  project,
  parentProject = null,
  pageContext = 'detail',
  breadcrumbNavigation,
  assigneeControl,
  tradeTypeControl,
  industryControl,
  actions,
  progress,
  onPrimaryPhotoUpdated,
  onPrimaryPhotoError,
  canEditPrimaryPhoto = false,
  mobileStageWorkflowTasks,
  mobileStageCompletions,
}: ProjectDetailHeaderProps): ReactElement {
  const isComplete = isCrmProjectComplete(project);
  const isInactive = isCrmProjectInactive(project);
  const isMobileLayout = useDashboardMobileLayout();
  const industryOrTrade = industryControl ?? tradeTypeControl;
  const inactiveStatus = <ProjectDetailInactiveStatus project={project} />;
  const showMobileStageSummary =
    isMobileLayout &&
    mobileStageWorkflowTasks != null &&
    mobileStageCompletions != null;

  const titleRow = (
    <div className={styles.titleRow}>
      {isInactive ? (
        <CrmProjectInactiveIcon ariaLabel={content.crm.table.inactiveBadge} />
      ) : isComplete ? (
        <CrmProjectCompleteIcon ariaLabel={content.crm.table.completionCheckAriaLabel} />
      ) : null}
      <h1 className={styles.title}>{project.client.name}</h1>
      {!isMobileLayout ? assigneeControl : null}
    </div>
  );

  return (
    <header
      className={
        isMobileLayout
          ? `${styles.detailHeader} ${styles.detailHeader_mobile}`
          : styles.detailHeader
      }
    >
      {isMobileLayout ? (
        <div className={styles.titleBlock}>
          <div className={styles.detailHeaderMobileBreadcrumbRow}>
            <ProjectDetailBreadcrumbNav
              project={project}
              parentProject={parentProject}
              pageContext={pageContext}
              navigation={breadcrumbNavigation}
              className={`${styles.breadcrumb} ${styles.detailHeaderMobileBreadcrumb}`}
            />
            {actions}
          </div>
          <div className={styles.detailHeaderMobileRow}>
            <div className={styles.detailHeaderMobileLead}>
              <ProjectPrimaryPhoto
                summary={project}
                parentSummary={parentProject}
                canEdit={canEditPrimaryPhoto && project.parentProjectId == null}
                onPhotoUpdated={(summary) => onPrimaryPhotoUpdated?.(summary)}
                onError={onPrimaryPhotoError}
              />
              <div className={styles.titleBlockMobileText}>
                {titleRow}
                <div className={styles.detailHeaderIndustryRow}>
                  {industryOrTrade}
                  {inactiveStatus}
                </div>
              </div>
            </div>
            {assigneeControl ? (
              <div className={styles.titleBlockMobileAside}>{assigneeControl}</div>
            ) : null}
          </div>
          {showMobileStageSummary ? (
            <ProjectDetailMobileHeaderProgress
              workflowTasks={mobileStageWorkflowTasks}
              manualStageCompletions={mobileStageCompletions}
            />
          ) : null}
        </div>
      ) : (
        <>
          <div className={styles.detailHeaderMain}>
            <div className={styles.titleBlock}>
              <ProjectDetailBreadcrumbNav
                project={project}
                parentProject={parentProject}
                pageContext={pageContext}
                navigation={breadcrumbNavigation}
              />
              <div className={styles.titleBlockBody}>
                <ProjectPrimaryPhoto
                  summary={project}
                  parentSummary={parentProject}
                  canEdit={canEditPrimaryPhoto && project.parentProjectId == null}
                  onPhotoUpdated={(summary) => onPrimaryPhotoUpdated?.(summary)}
                  onError={onPrimaryPhotoError}
                />
                <div className={styles.titleBlockContent}>
                  {titleRow}
                  {industryOrTrade}
                  {progress ? <div className={styles.titleBlockProgress}>{progress}</div> : null}
                </div>
                {isInactive ? (
                  <div className={styles.titleBlockInactiveBanner}>
                    <ProjectDetailInactiveStatus project={project} variant="banner" />
                  </div>
                ) : null}
              </div>
            </div>
          </div>
          {actions ? (
            <div className={styles.detailHeaderActionsColumn}>
              <div className={styles.detailHeaderActions}>{actions}</div>
            </div>
          ) : null}
        </>
      )}
    </header>
  );
}
