'use client';

import type { ReactElement, ReactNode } from 'react';
import type { CrmIndustry, CrmProjectDetail, CrmProjectSummary } from '@/domain/crm';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import type { ProjectDetailPageContext } from '@/presentation/features/crmProjectDetail/projectDetailPageContext';
import type { SummaryEditableField } from '@/presentation/features/crmProjectDetail/projectDetailFormModel';
import { getProjectIndustryDisplayLabel } from '@/presentation/features/crmProjects/crmProjectFormatters';
import { ProjectDetailHeader } from './ProjectDetailHeader';

export type { ProjectDetailPageContext } from '@/presentation/features/crmProjectDetail/projectDetailPageContext';
import { ProjectHeaderAssignee } from './ProjectHeaderAssignee';
import { ProjectHeaderIndustry } from './ProjectHeaderIndustry';
import { ProjectNotesInline } from './ProjectNotesInline';
import { useDashboardMobileLayout } from '@/presentation/features/crmProjects/useDashboardMobileLayout';
import { ProjectDetailMobileStageSummary } from './ProjectDetailMobileStageSummary';
import { ProjectSummaryStrip } from './ProjectSummaryStrip';
import { StageProgressBar } from './StageProgressBar';
import styles from './ProjectDetail.module.css';

export type ProjectDetailContextBlockProps = {
  project: CrmProjectDetail;
  isApiSource: boolean;
  pageContext?: ProjectDetailPageContext;
  isMemberRole?: boolean;
  onBack: () => void;
  onOpenProject?: () => void;
  onOpenParentProject?: () => void;
  parentProject?: CrmProjectSummary | null;
  actions?: ReactNode;
  progress?: ReactNode;
  onPrimaryPhotoUpdated?: (summary: CrmProjectSummary) => void;
  onPrimaryPhotoError?: (message: string) => void;
  savingField: SummaryEditableField | null;
  patchField: (field: SummaryEditableField, value: string) => Promise<boolean>;
  patchIndustry: (industry: CrmIndustry, customIndustry: string) => Promise<boolean>;
  onEditProject?: () => void;
  /** Overview body (tabs, subprojects) — composed into the mobile scroll region when on detail page. */
  scrollBody?: ReactNode;
};

export function ProjectDetailContextBlock({
  project,
  isApiSource,
  pageContext = 'detail',
  isMemberRole = false,
  onBack,
  onOpenProject,
  onOpenParentProject,
  parentProject = null,
  actions,
  progress,
  onPrimaryPhotoUpdated,
  onPrimaryPhotoError,
  savingField,
  patchField,
  patchIndustry,
  onEditProject,
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
      onBack={onBack}
      onOpenProject={onOpenProject}
      onOpenParentProject={onOpenParentProject}
      actions={actions}
      progress={progress}
      canEditPrimaryPhoto={!isMemberRole}
      onPrimaryPhotoUpdated={onPrimaryPhotoUpdated}
      onPrimaryPhotoError={onPrimaryPhotoError}
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

  const mobileStageSummary =
    !isMemberRole && isMobileLayout ? (
      <ProjectDetailMobileStageSummary
        workflowTasks={project.workflowTasks}
        manualStageCompletions={project.manualStageCompletions}
      />
    ) : null;

  const summaryStrip = (
    <ProjectSummaryStrip
      project={project}
      memberView={isMemberRole}
      readOnly={readOnly}
      savingField={savingField}
      patchField={patchField}
      onEditClick={onEditProject}
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
          {mobileStageSummary}
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
      {mobileStageSummary}
      {summaryStrip}
      {notes}
      {isMemberRole || isMobileLayout ? null : (
        <StageProgressBar
          workflowTasks={project.workflowTasks}
          manualStageCompletions={project.manualStageCompletions}
        />
      )}
    </div>
  );
}
