'use client';

import type { ReactElement } from 'react';
import { useMemo } from 'react';
import { BsCheckLg } from 'react-icons/bs';
import type {
  CrmProjectStageCompletion,
  CrmWorkflowTask,
  PipelineStage,
} from '@/domain/crm';
import { resolveWorkflowTasksBatchCompleteState } from './workflowTasksBatchCompleteState';
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
  const { canClick, title, allComplete } = useMemo(
    () =>
      resolveWorkflowTasksBatchCompleteState({
        workflowTasks,
        manualStageCompletions,
        stages,
        disabled,
        busy,
      }),
    [busy, disabled, manualStageCompletions, stages, workflowTasks]
  );

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
