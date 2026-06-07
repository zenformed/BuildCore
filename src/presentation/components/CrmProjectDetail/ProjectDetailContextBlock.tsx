'use client';

import type { ReactElement, ReactNode } from 'react';
import type { CrmProjectDetail } from '@/domain/crm';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import type { ProjectDetailPageContext } from '@/presentation/features/crmProjectDetail/projectDetailPageContext';
import type { SummaryEditableField } from '@/presentation/features/crmProjectDetail/projectDetailFormModel';
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
  actions?: ReactNode;
  savingField: SummaryEditableField | null;
  patchField: (field: SummaryEditableField, value: string) => Promise<boolean>;
};

export function ProjectDetailContextBlock({
  project,
  isApiSource,
  pageContext = 'detail',
  isMemberRole = false,
  onBack,
  onOpenProject,
  actions,
  savingField,
  patchField,
}: ProjectDetailContextBlockProps): ReactElement {
  const readOnly = isMemberRole;

  return (
    <div className={styles.detailTop}>
      <ProjectDetailHeader
        project={project.summary}
        pageContext={pageContext}
        onBack={onBack}
        onOpenProject={onOpenProject}
        actions={actions}
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
          isMemberRole ? null : (
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
