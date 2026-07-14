'use client';

import type { ReactElement } from 'react';
import { useMemo } from 'react';
import { BsCheckLg } from 'react-icons/bs';
import type {
  CrmProjectStageCompletion,
  CrmWorkflowTask,
  PipelineStage,
} from '@/domain/crm';
import {
  areAllWorkflowStagesComplete,
  listEmptyIncompleteWorkflowStages,
} from '@/domain/crm';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import styles from './ProjectDetail.module.css';

export type WorkflowTasksBatchCompleteButtonProps = {
  workflowTasks: readonly CrmWorkflowTask[];
  manualStageCompletions: readonly CrmProjectStageCompletion[];
  stages: readonly PipelineStage[];
  disabled?: boolean;
  busy?: boolean;
  onClick: () => void;
};

export function WorkflowTasksBatchCompleteButton({
  workflowTasks,
  manualStageCompletions,
  stages,
  disabled = false,
  busy = false,
  onClick,
}: WorkflowTasksBatchCompleteButtonProps): ReactElement {
  const wf = content.projectDetail.workflow;
  const completionInput = useMemo(
    () => ({ workflowTasks, manualStageCompletions, stages }),
    [manualStageCompletions, stages, workflowTasks]
  );
  const allComplete = useMemo(
    () => areAllWorkflowStagesComplete(completionInput),
    [completionInput]
  );
  const emptyIncompleteStages = useMemo(
    () => listEmptyIncompleteWorkflowStages(completionInput),
    [completionInput]
  );
  const canClick = !allComplete && emptyIncompleteStages.length > 0 && !disabled && !busy;
  const title = allComplete
    ? wf.markAllEmptyStagesCompleteAllDone
    : emptyIncompleteStages.length === 0
      ? wf.markAllEmptyStagesCompleteNone
      : wf.markAllEmptyStagesCompleteAction;

  return (
    <button
      type="button"
      className={`${styles.detailPanelHeaderBtn} ${styles.detailPanelHeaderBtn_complete}`}
      title={title}
      aria-label={title}
      disabled={!canClick}
      aria-busy={busy || undefined}
      onClick={onClick}
    >
      <BsCheckLg
        className={
          allComplete
            ? styles.detailPanelHeaderCompleteCheck_done
            : styles.detailPanelHeaderCompleteCheck_pending
        }
        size={17}
        aria-hidden
      />
    </button>
  );
}
