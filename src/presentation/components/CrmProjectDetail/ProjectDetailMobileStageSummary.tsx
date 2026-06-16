'use client';

import type { ReactElement } from 'react';
import type { CrmProjectStageCompletion, CrmWorkflowTask } from '@/domain/crm';
import { useProjectDetailMobileStageSummary } from './useProjectDetailMobileStageSummary';
import shared from '@/presentation/components/crmShared/crmShared.module.css';
import styles from './ProjectDetail.module.css';

export type ProjectDetailMobileStageSummaryProps = {
  readonly workflowTasks: readonly CrmWorkflowTask[];
  readonly manualStageCompletions: readonly CrmProjectStageCompletion[];
};

function ProjectDetailMobileStagePillWithPercent({
  stagePillLabel,
  progressPercent,
}: {
  readonly stagePillLabel: string;
  readonly progressPercent: number;
}): ReactElement {
  return (
    <div className={styles.detailHeaderMobileStageEnd}>
      <span
        className={`${shared.stagePill} ${styles.detailHeaderMobileStagePill}`}
        title={stagePillLabel}
      >
        {stagePillLabel}
      </span>
      <span
        className={styles.detailHeaderMobileStageCount}
        aria-label={`Project progress ${progressPercent}%`}
      >
        {progressPercent}%
      </span>
    </div>
  );
}

export function ProjectDetailMobileStageEnd({
  workflowTasks,
  manualStageCompletions,
}: ProjectDetailMobileStageSummaryProps): ReactElement | null {
  const stageSummary = useProjectDetailMobileStageSummary(workflowTasks, manualStageCompletions);

  if (stageSummary == null) {
    return null;
  }

  return (
    <ProjectDetailMobileStagePillWithPercent
      stagePillLabel={stageSummary.stagePillLabel}
      progressPercent={stageSummary.progress.textPercent}
    />
  );
}

export function ProjectDetailMobileHeaderProgress({
  workflowTasks,
  manualStageCompletions,
}: ProjectDetailMobileStageSummaryProps): ReactElement | null {
  const stageSummary = useProjectDetailMobileStageSummary(workflowTasks, manualStageCompletions);

  if (stageSummary == null) {
    return null;
  }

  return (
    <div className={styles.detailHeaderMobileProgress}>
      <ProjectDetailMobileStagePillWithPercent
        stagePillLabel={stageSummary.stagePillLabel}
        progressPercent={stageSummary.progress.textPercent}
      />
    </div>
  );
}
