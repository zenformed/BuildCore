'use client';

import type { ReactElement } from 'react';
import { ProjectDetailActionsMenu } from './ProjectDetailActionsMenu';
import { ProjectDetailCompletionButton } from './ProjectDetailCompletionButton';
import styles from './ProjectDetail.module.css';

export type ProjectDetailHeaderActionsProps = {
  projectSlug: string;
  isComplete: boolean;
  completionBusy: boolean;
  onMarkComplete: () => void;
  onMarkIncomplete: () => void;
  markCompleteLabel: string;
  markIncompleteLabel: string;
};

export function ProjectDetailHeaderActions({
  projectSlug,
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
        busy={completionBusy}
        onMarkComplete={onMarkComplete}
        onMarkIncomplete={onMarkIncomplete}
        markCompleteLabel={markCompleteLabel}
        markIncompleteLabel={markIncompleteLabel}
      />
      <ProjectDetailActionsMenu projectSlug={projectSlug} />
    </div>
  );
}
