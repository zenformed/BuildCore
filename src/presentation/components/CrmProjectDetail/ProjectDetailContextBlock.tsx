'use client';

import type { ReactElement, ReactNode } from 'react';
import type { CrmProjectDetail, CrmProjectSummary } from '@/domain/crm';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import type { ProjectDetailPageContext } from '@/presentation/features/crmProjectDetail/projectDetailPageContext';
import type { SummaryEditableField } from '@/presentation/features/crmProjectDetail/projectDetailFormModel';
import { getProjectTradeSubtitle } from '@/presentation/features/crmProjects/crmProjectFormatters';
import { ProjectDetailHeader } from './ProjectDetailHeader';

export type { ProjectDetailPageContext } from '@/presentation/features/crmProjectDetail/projectDetailPageContext';
import { ProjectHeaderAssignee } from './ProjectHeaderAssignee';
import { ProjectHeaderTradeType } from './ProjectHeaderTradeType';
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
  onEditProject,
}: ProjectDetailContextBlockProps): ReactElement {
  const readOnly = isMemberRole;

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
        tradeTypeControl={
          isMemberRole ? (
            <p className={`${styles.subtitle} ${styles.headerTradeSubtitle}`}>
              {getProjectTradeSubtitle(project.summary.tradeType) ?? project.summary.tradeType}
            </p>
          ) : (
            <ProjectHeaderTradeType
              tradeType={project.summary.tradeType}
              isSaving={savingField === 'tradeType'}
              onTradeTypeChange={(value) => patchField('tradeType', value)}
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
      {isMemberRole ? null : <StageProgressBar stageProgress={project.stageProgress} />}
    </div>
  );
}
