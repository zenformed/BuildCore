'use client';

import type { ReactElement } from 'react';
import type { CrmProjectSummary } from '@/domain/crm';
import { ProjectDetailActionsMenu } from './ProjectDetailActionsMenu';
import { ProjectDetailCompletionButton } from './ProjectDetailCompletionButton';
import styles from './ProjectDetail.module.css';

export type ProjectDetailHeaderActionsProps = {
  projectSlug: string;
  projectSummary: CrmProjectSummary;
  canDelete: boolean;
  canSaveTemplate: boolean;
  deleting: boolean;
  onRequestDelete: (project: CrmProjectSummary) => void;
  onSaveTemplate: () => void;
  isComplete: boolean;
  completionBusy: boolean;
  onMarkComplete: () => void;
  onMarkIncomplete: () => void;
  markCompleteLabel: string;
  markIncompleteLabel: string;
};

export function ProjectDetailHeaderActions({
  projectSlug,
  projectSummary,
  canDelete,
  canSaveTemplate,
  deleting,
  onRequestDelete,
  onSaveTemplate,
  isComplete,
  completionBusy,
  onMarkComplete,
  onMarkIncomplete,
  markCompleteLabel,
  markIncompleteLabel,
}: ProjectDetailHeaderActionsProps): ReactElement {
  return (
    <div className={styles.detailHeaderActions}>
      <ProjectDetailCompletionButton
        isComplete={isComplete}
        busy={completionBusy || deleting}
        onMarkComplete={onMarkComplete}
        onMarkIncomplete={onMarkIncomplete}
        markCompleteLabel={markCompleteLabel}
        markIncompleteLabel={markIncompleteLabel}
      />
      <ProjectDetailActionsMenu
        projectSlug={projectSlug}
        projectSummary={projectSummary}
        canDelete={canDelete}
        canSaveTemplate={canSaveTemplate}
        deleting={deleting}
        onRequestDelete={onRequestDelete}
        onSaveTemplate={onSaveTemplate}
      />
    </div>
  );
}
