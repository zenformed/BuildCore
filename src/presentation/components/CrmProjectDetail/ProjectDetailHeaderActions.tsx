'use client';

import type { ReactElement } from 'react';
import type { CrmPriority, CrmProjectSummary } from '@/domain/crm';
import type { ProjectDetailRoutes } from '@/platform/navigation/projectDetailRoutes';
import { ProjectDetailActionsMenu } from './ProjectDetailActionsMenu';
import { ProjectDetailCompletionButton } from './ProjectDetailCompletionButton';
import { ProjectPriorityToggle } from './ProjectPriorityToggle';
import styles from './ProjectDetail.module.css';

export type ProjectDetailHeaderActionsProps = {
  routes: ProjectDetailRoutes;
  projectSummary: CrmProjectSummary;
  canDelete: boolean;
  canSaveTemplate: boolean;
  loadTemplateLabel: string;
  saveTemplateLabel: string;
  deleting: boolean;
  onRequestDelete: (project: CrmProjectSummary) => void;
  onSaveTemplate: () => void;
  onLoadTemplate: () => void;
  isComplete: boolean;
  completionBusy: boolean;
  onMarkComplete: () => void;
  onMarkIncomplete: () => void;
  markCompleteLabel: string;
  markIncompleteLabel: string;
  priority: CrmPriority;
  priorityBusy: boolean;
  priorityDisabled?: boolean;
  markPriorityLabel: string;
  removePriorityLabel: string;
  onPriorityToggle: (nextPriority: CrmPriority) => void | Promise<void>;
};

export function ProjectDetailHeaderActions({
  routes,
  projectSummary,
  canDelete,
  canSaveTemplate,
  loadTemplateLabel,
  saveTemplateLabel,
  deleting,
  onRequestDelete,
  onSaveTemplate,
  onLoadTemplate,
  isComplete,
  completionBusy,
  onMarkComplete,
  onMarkIncomplete,
  markCompleteLabel,
  markIncompleteLabel,
  priority,
  priorityBusy,
  priorityDisabled = false,
  markPriorityLabel,
  removePriorityLabel,
  onPriorityToggle,
}: ProjectDetailHeaderActionsProps): ReactElement {
  return (
    <div className={styles.detailHeaderActions}>
      <ProjectPriorityToggle
        priority={priority}
        busy={priorityBusy || deleting}
        disabled={priorityDisabled}
        markPriorityLabel={markPriorityLabel}
        removePriorityLabel={removePriorityLabel}
        onToggle={onPriorityToggle}
      />
      <ProjectDetailCompletionButton
        isComplete={isComplete}
        busy={completionBusy || deleting}
        onMarkComplete={onMarkComplete}
        onMarkIncomplete={onMarkIncomplete}
        markCompleteLabel={markCompleteLabel}
        markIncompleteLabel={markIncompleteLabel}
      />
      <ProjectDetailActionsMenu
        routes={routes}
        projectSummary={projectSummary}
        canDelete={canDelete}
        canSaveTemplate={canSaveTemplate}
        loadTemplateLabel={loadTemplateLabel}
        saveTemplateLabel={saveTemplateLabel}
        deleting={deleting}
        onRequestDelete={onRequestDelete}
        onSaveTemplate={onSaveTemplate}
        onLoadTemplate={onLoadTemplate}
      />
    </div>
  );
}
