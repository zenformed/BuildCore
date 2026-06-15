'use client';

import { useMemo, type ReactElement } from 'react';
import type { CrmProjectStageCompletion, CrmWorkflowTask } from '@/domain/crm';
import { CRM_PROJECT_COMPLETE_STAGE_SLUG } from '@/domain/crm/projectCompletion';
import {
  resolveProjectDetailProgressDisplay,
  resolveWorkflowPipelineGraphState,
} from '@/domain/buildcore/projectPipelineProgress';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { formatStageLabel } from '@/presentation/features/crmProjects/crmProjectFormatters';
import { useProjectDetailShell } from '@/presentation/features/crmProjectDetail/ProjectDetailShellContext';
import { useBuildCorePipelineStages } from '@/presentation/providers/BuildCorePipelineStagesProvider';
import { ProjectProgressPercent } from './ProjectProgressPercent';
import shared from '@/presentation/components/crmShared/crmShared.module.css';
import styles from './ProjectDetail.module.css';

export type ProjectDetailMobileStageSummaryProps = {
  readonly workflowTasks: readonly CrmWorkflowTask[];
  readonly manualStageCompletions: readonly CrmProjectStageCompletion[];
};

export function ProjectDetailMobileStageSummary({
  workflowTasks,
  manualStageCompletions,
}: ProjectDetailMobileStageSummaryProps): ReactElement | null {
  const { project, isMemberRole } = useProjectDetailShell();
  const { catalogForProject } = useBuildCorePipelineStages();
  const catalog = catalogForProject({ parentProjectId: project.summary.parentProjectId });

  const graphState = useMemo(
    () =>
      resolveWorkflowPipelineGraphState({
        workflowTasks,
        stages: catalog,
        manualStageCompletions,
      }),
    [catalog, manualStageCompletions, workflowTasks]
  );

  const progress = useMemo(
    () =>
      resolveProjectDetailProgressDisplay({
        workflowTasks,
        manualStageCompletions,
        stages: catalog,
      }),
    [catalog, manualStageCompletions, workflowTasks]
  );

  const totalStages = graphState.stageStatuses.length;

  const { currentStageIndex, stagePillLabel } = useMemo(() => {
    if (totalStages === 0) {
      return { currentStageIndex: 0, stagePillLabel: '—' };
    }

    if (graphState.derivedCurrentStageSlug == null) {
      return {
        currentStageIndex: totalStages,
        stagePillLabel: formatStageLabel(CRM_PROJECT_COMPLETE_STAGE_SLUG, catalog),
      };
    }

    const currentIndex = graphState.stageStatuses.findIndex(
      (stage) => stage.stageSlug === graphState.derivedCurrentStageSlug
    );
    const stage = currentIndex >= 0 ? graphState.stageStatuses[currentIndex] : null;

    return {
      currentStageIndex: currentIndex >= 0 ? currentIndex + 1 : totalStages,
      stagePillLabel: stage?.stageLabel ?? formatStageLabel(graphState.derivedCurrentStageSlug, catalog),
    };
  }, [catalog, graphState.derivedCurrentStageSlug, graphState.stageStatuses, totalStages]);

  if (isMemberRole || totalStages === 0) {
    return null;
  }

  const stagePositionLabel = `${currentStageIndex}/${totalStages}`;

  return (
    <section
      className={styles.mobileStageSummary}
      aria-label={content.projectDetail.pipelineAriaLabel}
    >
      <div className={styles.mobileStageSummaryProgress}>
        <ProjectProgressPercent variant="compact" progress={progress} />
      </div>
      <div className={styles.mobileStageSummaryEnd}>
        <span
          className={`${shared.stagePill} ${styles.mobileStageSummaryPill}`}
          title={stagePillLabel}
        >
          {stagePillLabel}
        </span>
        <span className={styles.mobileStageSummaryCount} aria-label={`Stage ${stagePositionLabel}`}>
          {stagePositionLabel}
        </span>
      </div>
    </section>
  );
}
