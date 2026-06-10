'use client';

import type { ReactElement, ReactNode } from 'react';
import { useCallback } from 'react';
import type { CrmIndustry, CrmProjectDetail, CrmProjectSummary, PipelineStageSlug } from '@/domain/crm';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import type { ProjectDetailPageContext } from '@/presentation/features/crmProjectDetail/projectDetailPageContext';
import type { SummaryEditableField } from '@/presentation/features/crmProjectDetail/projectDetailFormModel';
import { getProjectIndustryDisplayLabel } from '@/presentation/features/crmProjects/crmProjectFormatters';
import { ProjectDetailHeader } from './ProjectDetailHeader';

export type { ProjectDetailPageContext } from '@/presentation/features/crmProjectDetail/projectDetailPageContext';
import { ProjectHeaderAssignee } from './ProjectHeaderAssignee';
import { ProjectHeaderIndustry } from './ProjectHeaderIndustry';
import { ProjectNotesInline } from './ProjectNotesInline';
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
}: ProjectDetailContextBlockProps): ReactElement {
  const readOnly = isMemberRole;
  const canEditStage = !readOnly && isApiSource;

  const handleStageSelect = useCallback(
    (slug: PipelineStageSlug) => {
      if (slug === project.stageProgress.currentStageSlug) return;
      void patchField('currentStageSlug', slug);
    },
    [patchField, project.stageProgress.currentStageSlug]
  );

  return (
    <div className={styles.detailTop}>
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
      <ProjectSummaryStrip
        project={project}
        memberView={isMemberRole}
        readOnly={readOnly}
        savingField={savingField}
        patchField={patchField}
        onEditClick={onEditProject}
      />
      <ProjectNotesInline
        label={content.projectDetail.projectNotesLabel}
        notes={project.notes}
        readOnly={readOnly}
        savingField={savingField}
        onPatch={patchField}
      />
      {isMemberRole ? null : (
        <StageProgressBar
          stageProgress={project.stageProgress}
          editable={canEditStage}
          isSaving={savingField === 'currentStageSlug'}
          onStageSelect={handleStageSelect}
        />
      )}
    </div>
  );
}
