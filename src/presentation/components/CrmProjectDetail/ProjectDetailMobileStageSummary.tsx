'use client';

import type { ReactElement } from 'react';
import type { CrmProjectStageCompletion, CrmWorkflowTask } from '@/domain/crm';
import { ProjectProgressPercent } from './ProjectProgressPercent';
import { useProjectDetailMobileStageSummary } from './useProjectDetailMobileStageSummary';
import shared from '@/presentation/components/crmShared/crmShared.module.css';
import styles from './ProjectDetail.module.css';

export type ProjectDetailMobileStageSummaryProps = {
  readonly workflowTasks: readonly CrmWorkflowTask[];
  readonly manualStageCompletions: readonly CrmProjectStageCompletion[];
};

export function ProjectDetailMobileStageEnd({
  workflowTasks,
  manualStageCompletions,
}: ProjectDetailMobileStageSummaryProps): ReactElement | null {
  const stageSummary = useProjectDetailMobileStageSummary(workflowTasks, manualStageCompletions);

  if (stageSummary == null) {
    return null;
  }

  return (
    <div className={styles.detailHeaderMobileStageEnd}>
      <span
        className={`${shared.stagePill} ${styles.detailHeaderMobileStagePill}`}
        title={stageSummary.stagePillLabel}
      >
        {stageSummary.stagePillLabel}
      </span>
      <span
        className={styles.detailHeaderMobileStageCount}
        aria-label={`Stage ${stageSummary.stagePositionLabel}`}
      >
        {stageSummary.stagePositionLabel}
      </span>
    </div>
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
      <ProjectProgressPercent progress={stageSummary.progress} />
      <div className={styles.detailHeaderMobileStageEnd}>
        <span
          className={`${shared.stagePill} ${styles.detailHeaderMobileStagePill}`}
          title={stageSummary.stagePillLabel}
        >
          {stageSummary.stagePillLabel}
        </span>
        <span
          className={styles.detailHeaderMobileStageCount}
          aria-label={`Stage ${stageSummary.stagePositionLabel}`}
        >
          {stageSummary.stagePositionLabel}
        </span>
      </div>
    </div>
  );
}
