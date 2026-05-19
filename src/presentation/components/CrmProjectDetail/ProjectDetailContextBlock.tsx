'use client';

import type { ReactElement, ReactNode } from 'react';
import type { CrmProjectDetail } from '@/domain/crm';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import type { SummaryEditableField } from '@/presentation/features/crmProjectDetail/projectDetailFormModel';
import { ProjectDetailHeader } from './ProjectDetailHeader';
import { ProjectHeaderAssignee } from './ProjectHeaderAssignee';
import { ProjectHeaderTradeType } from './ProjectHeaderTradeType';
import { ProjectNotesInline } from './ProjectNotesInline';
import { ProjectSummaryStrip } from './ProjectSummaryStrip';
import { StageProgressBar } from './StageProgressBar';
import styles from './ProjectDetail.module.css';

export type ProjectDetailPageContext =
  | 'detail'
  | 'workflowTasks'
  | 'documents'
  | 'accountability'
  | 'financials';

export type ProjectDetailContextBlockProps = {
  project: CrmProjectDetail;
  isApiSource: boolean;
  pageContext?: ProjectDetailPageContext;
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
  onBack,
  onOpenProject,
  actions,
  savingField,
  patchField,
}: ProjectDetailContextBlockProps): ReactElement {
  return (
    <div className={styles.detailTop}>
      <ProjectDetailHeader
        project={project.summary}
        pageContext={pageContext}
        onBack={onBack}
        onOpenProject={onOpenProject}
        actions={actions}
        assigneeControl={
          <ProjectHeaderAssignee
            assignedTo={project.summary.assignedTo}
            isApiSource={isApiSource}
            isSaving={savingField === 'assignedMemberId'}
            onAssigneeChange={(id) => patchField('assignedMemberId', id)}
          />
        }
        tradeTypeControl={
          <ProjectHeaderTradeType
            tradeType={project.summary.tradeType}
            isSaving={savingField === 'tradeType'}
            onTradeTypeChange={(value) => patchField('tradeType', value)}
          />
        }
      />
      <ProjectSummaryStrip project={project} savingField={savingField} patchField={patchField} />
      <ProjectNotesInline
        label={content.projectDetail.projectNotesLabel}
        notes={project.notes}
        savingField={savingField}
        onPatch={patchField}
      />
      <StageProgressBar stageProgress={project.stageProgress} />
    </div>
  );
}
