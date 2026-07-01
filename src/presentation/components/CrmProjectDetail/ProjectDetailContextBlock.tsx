'use client';

import type { ReactElement, ReactNode } from 'react';
import type { CrmIndustry, CrmProjectDetail, CrmProjectSummary } from '@/domain/crm';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import type { ProjectDetailPageContext } from '@/presentation/features/crmProjectDetail/projectDetailPageContext';
import type { SummaryEditableField } from '@/presentation/features/crmProjectDetail/projectDetailFormModel';
import { getProjectIndustryDisplayLabel } from '@/presentation/features/crmProjects/crmProjectFormatters';
import { ProjectDetailHeader } from './ProjectDetailHeader';
import type { ProjectDetailBreadcrumbNavigation } from './ProjectDetailBreadcrumbNav';

export type { ProjectDetailPageContext } from '@/presentation/features/crmProjectDetail/projectDetailPageContext';
import { ProjectHeaderAssignee } from './ProjectHeaderAssignee';
import { ProjectHeaderIndustry } from './ProjectHeaderIndustry';
import { ProjectNotesInline } from './ProjectNotesInline';
import { useDashboardMobileLayout } from '@/presentation/features/crmProjects/useDashboardMobileLayout';
import { ProjectSummaryStrip } from './ProjectSummaryStrip';
import { StageProgressBar } from './StageProgressBar';
import styles from './ProjectDetail.module.css';

export type ProjectDetailContextBlockProps = {
  project: CrmProjectDetail;
  isApiSource: boolean;
  pageContext?: ProjectDetailPageContext;
  isMemberRole?: boolean;
  breadcrumbNavigation: ProjectDetailBreadcrumbNavigation;
  parentProject?: CrmProjectSummary | null;
  actions?: ReactNode;
  progress?: ReactNode;
  onPrimaryPhotoUpdated?: (summary: CrmProjectSummary) => void;
  onPrimaryPhotoError?: (message: string) => void;
  savingField: SummaryEditableField | null;
  patchField: (field: SummaryEditableField, value: string) => Promise<boolean>;
  patchIndustry: (industry: CrmIndustry, customIndustry: string) => Promise<boolean>;
  /** Overview body (tabs, subprojects) — composed into the mobile scroll region when on detail page. */
  scrollBody?: ReactNode;
};

export function ProjectDetailContextBlock({
  project,
  isApiSource,
  pageContext = 'detail',
  isMemberRole = false,
  breadcrumbNavigation,
  parentProject = null,
  actions,
  progress,
  onPrimaryPhotoUpdated,
  onPrimaryPhotoError,
  savingField,
  patchField,
  patchIndustry,
  scrollBody,
}: ProjectDetailContextBlockProps): ReactElement {
  const readOnly = isMemberRole;
  const isMobileLayout = useDashboardMobileLayout();
  const isMobileDetailOverview =
    isMobileLayout && pageContext === 'detail' && scrollBody != null;

  const header = (
    <ProjectDetailHeader
      project={project.summary}
      parentProject={parentProject}
      pageContext={pageContext}
      breadcrumbNavigation={breadcrumbNavigation}
      actions={actions}
      progress={progress}
      canEditPrimaryPhoto={!isMemberRole}
      onPrimaryPhotoUpdated={onPrimaryPhotoUpdated}
      onPrimaryPhotoError={onPrimaryPhotoError}
      mobileStageWorkflowTasks={
        !isMemberRole && isMobileLayout ? project.workflowTasks : undefined
      }
      mobileStageCompletions={
        !isMemberRole && isMobileLayout ? project.manualStageCompletions : undefined
      }
      assigneeControl={
        isMemberRole ? null : (
          <ProjectHeaderAssignee
            assignedTo={project.summary.assignedTo}
            isApiSource={isApiSource}
            isSaving={savingField === 'assignedMemberId'}
            onAssigneeChange={(id) => patchField('assignedMemberId', id)}
          />
        )
      }
      industryControl={
        isMemberRole ? (
          <p className={`${styles.subtitle} ${styles.headerTradeSubtitle}`}>
            {getProjectIndustryDisplayLabel(
              project.summary.industry,
              project.summary.customIndustry
            )}
          </p>
        ) : (
          <ProjectHeaderIndustry
            industry={project.summary.industry}
            customIndustry={project.summary.customIndustry}
            isSaving={savingField === 'industry' || savingField === 'customIndustry'}
            onIndustryChange={patchIndustry}
          />
        )
      }
    />
  );

  const summaryStrip = (
    <ProjectSummaryStrip
      project={project}
      memberView={isMemberRole}
      readOnly={readOnly}
      savingField={savingField}
      patchField={patchField}
    />
  );

  const notes = (
    <ProjectNotesInline
      label={content.projectDetail.projectNotesLabel}
      notes={project.notes}
      readOnly={readOnly}
      savingField={savingField}
      onPatch={patchField}
    />
  );

  if (isMobileDetailOverview) {
    return (
      <div className={styles.detailMobilePage}>
        <div className={styles.detailMobileStickyHeader}>
          {header}
        </div>
        <div className={styles.detailMobileScroll}>
          {summaryStrip}
          {notes}
          {scrollBody}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.detailTop}>
      {header}
      {summaryStrip}
      {notes}
      {isMobileLayout ? null : (
        <StageProgressBar
          workflowTasks={project.workflowTasks}
          manualStageCompletions={project.manualStageCompletions}
        />
      )}
    </div>
  );
}
