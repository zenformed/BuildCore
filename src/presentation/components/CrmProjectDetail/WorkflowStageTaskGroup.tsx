'use client';

import type { ReactElement, MouseEvent } from 'react';
import type { CrmProjectStageCompletion, CrmWorkflowTask, PipelineStageSlug } from '@/domain/crm';
import { isStageManuallyCompleted } from '@/domain/crm/projectStageCompletion';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import {
  formatWorkflowStageTaskCompletionPercent,
  isWorkflowStageGroupComplete,
  summarizeWorkflowStageTaskCompletion,
  type WorkflowTaskStageGroup,
} from '@/presentation/features/crmProjectDetail/workflowTaskGroups';
import { useWorkflowStageExpanded } from '@/presentation/features/crmProjectDetail/useWorkflowStageExpanded';
import { CrmProjectStatusCircleIcon } from '@/presentation/components/crmShared/CrmProjectStatusCircleIcon';
import { WorkflowTaskInlineRow } from './WorkflowTaskInlineRow';
import styles from './ProjectDetail.module.css';

export type ManualStageCompletionToggleAction = 'complete' | 'incomplete';

export type WorkflowStageTaskGroupProps = {
  projectSlug: string;
  projectDocuments: readonly import('@/domain/crm').CrmDocumentMetadata[];
  group: WorkflowTaskStageGroup;
  manualStageCompletions: readonly CrmProjectStageCompletion[];
  docCounts: ReadonlyMap<string, number>;
  isApiSource: boolean;
  onTaskUpdated: (task: CrmWorkflowTask) => Promise<void>;
  onTaskError?: (message: string) => void;
  onRequestArchiveTask?: (task: CrmWorkflowTask) => void;
  onRequestToggleManualStageCompletion?: (
    stageSlug: PipelineStageSlug,
    action: ManualStageCompletionToggleAction,
    stageLabel: string
  ) => void;
  markStageCompleteBusy?: boolean;
  /** When false, stage is always expanded with a static header (e.g. "View all" modal). */
  collapsible?: boolean;
  /** Keep the stage expanded while composing an inline draft row. */
  forceExpanded?: boolean;
  draftRow?: ReactElement | null;
};

export function WorkflowStageTaskGroup({
  projectSlug,
  projectDocuments,
  group,
  manualStageCompletions,
  docCounts,
  isApiSource,
  onTaskUpdated,
  onTaskError,
  onRequestArchiveTask,
  onRequestToggleManualStageCompletion,
  markStageCompleteBusy = false,
  collapsible = true,
  forceExpanded = false,
  draftRow = null,
}: WorkflowStageTaskGroupProps): ReactElement {
  const cols = content.projectDetail.workflow.columns;
  const wf = content.projectDetail.workflow;
  const persisted = useWorkflowStageExpanded(projectSlug, group.collapseKey);
  const expanded = forceExpanded || (collapsible ? persisted.expanded : true);
  const groupClass = [
    styles.stageGroup,
    collapsible && !expanded ? styles.stageGroup_collapsed : '',
  ]
    .filter(Boolean)
    .join(' ');
  const panelId = `workflow-stage-${projectSlug}-${group.collapseKey}`;
  const gridClass = group.isPaymentsGroup
    ? `${styles.workflowGrid} ${styles.workflowGridPayments}`
    : styles.workflowGrid;
  const stageIsComplete = isWorkflowStageGroupComplete(
    group.stageSlug,
    group.tasks,
    manualStageCompletions
  );
  const { totalCount, percentComplete } = summarizeWorkflowStageTaskCompletion(
    group.tasks,
    manualStageCompletions,
    group.stageSlug
  );
  const completionPercentLabel = formatWorkflowStageTaskCompletionPercent(percentComplete);
  const taskCountText =
    totalCount === 1 ? `1 ${wf.taskSingular}` : `${totalCount} ${wf.taskPlural}`;
  const showEmptyRow = group.tasks.length === 0 && draftRow == null;
  const isEmptyStage = showEmptyRow;
  const isManuallyCompleted =
    isEmptyStage && isStageManuallyCompleted(group.stageSlug, manualStageCompletions);
  const canToggleManualStageCompletion =
    isEmptyStage && onRequestToggleManualStageCompletion != null;
  const manualToggleAction: ManualStageCompletionToggleAction = isManuallyCompleted
    ? 'incomplete'
    : 'complete';
  const manualToggleConfirmTitle =
    manualToggleAction === 'complete'
      ? wf.markStageCompleteConfirmTitle(group.stageLabel)
      : wf.markStageIncompleteConfirmTitle;

  const handleToggleManualStageCompletionClick = (event: MouseEvent<HTMLButtonElement>): void => {
    event.stopPropagation();
    if (markStageCompleteBusy || !canToggleManualStageCompletion) return;
    onRequestToggleManualStageCompletion?.(group.stageSlug, manualToggleAction, group.stageLabel);
  };

  const completeIcon = (
    <CrmProjectStatusCircleIcon kind="complete" active={stageIsComplete} size={16} />
  );

  const stageTitle = (
    <span className={styles.stageGroupTitle}>
      {canToggleManualStageCompletion ? (
        <button
          type="button"
          className={styles.stageGroupCompleteIconBtn}
          title={manualToggleConfirmTitle}
          aria-label={manualToggleConfirmTitle}
          disabled={markStageCompleteBusy}
          onClick={handleToggleManualStageCompletionClick}
        >
          {completeIcon}
        </button>
      ) : (
        <span
          className={styles.stageGroupCompleteIcon}
          title={stageIsComplete ? wf.stageAllDone : wf.stageNotComplete}
          aria-label={stageIsComplete ? wf.stageAllDone : wf.stageNotComplete}
        >
          {completeIcon}
        </span>
      )}
      <span className={styles.stageGroupName}>{group.stageLabel}</span>
      {collapsible ? (
        <span className={styles.stageGroupChevronWrap} aria-hidden>
          <span className={expanded ? styles.stageGroupChevron_expanded : styles.stageGroupChevron} />
        </span>
      ) : null}
    </span>
  );

  const taskCount = (
    <span className={styles.stageGroupCount}>
      {taskCountText} · {completionPercentLabel}
    </span>
  );

  const table = (
    <div id={panelId} className={styles.stageGroupTable}>
      <div className={`${styles.tableHeader} ${gridClass}`} role="row">
        <span role="columnheader">{cols.status}</span>
        <span role="columnheader">{cols.task}</span>
        {group.isPaymentsGroup ? <span role="columnheader">{cols.amount}</span> : null}
        <span role="columnheader">{cols.documents}</span>
        <span role="columnheader">{cols.assigned}</span>
        <span role="columnheader">{cols.due}</span>
        <span role="columnheader" className={styles.taskDeleteHeader} aria-hidden />
      </div>
      {group.tasks.map((task) => (
        <WorkflowTaskInlineRow
          key={task.id}
          projectSlug={projectSlug}
          task={task}
          docCount={docCounts.get(task.id) ?? 0}
          taskDocuments={projectDocuments.filter((doc) => doc.workflowTaskId === task.id)}
          showAmountColumn={group.isPaymentsGroup}
          isApiSource={isApiSource}
          onUpdated={onTaskUpdated}
          onTaskError={onTaskError}
          onRequestArchiveTask={onRequestArchiveTask}
        />
      ))}
      {showEmptyRow ? (
        <div
          className={`${styles.tableRow} ${gridClass} ${styles.workflowStageEmptyRow}`}
          role="row"
        >
          <span className={styles.workflowStageEmptyCell} aria-hidden />
          <span className={styles.workflowStageEmptyMessage}>{wf.stageNoTasks}</span>
          {group.isPaymentsGroup ? <span className={styles.workflowStageEmptyCell} aria-hidden /> : null}
          <span className={styles.workflowStageEmptyCell} aria-hidden />
          <span className={styles.workflowStageEmptyCell} aria-hidden />
          <span className={styles.workflowStageEmptyCell} aria-hidden />
          <span aria-hidden />
        </div>
      ) : null}
      {draftRow}
    </div>
  );

  return (
    <section className={groupClass} aria-label={group.stageLabel}>
      {collapsible ? (
        <button
          type="button"
          className={styles.stageGroupHeaderBtn}
          onClick={persisted.toggle}
          aria-expanded={expanded}
          aria-controls={panelId}
          aria-label={`${expanded ? wf.collapseStageTasks : wf.expandStageTasks}: ${group.stageLabel}`}
        >
          {stageTitle}
          {taskCount}
        </button>
      ) : (
        <div className={styles.stageGroupHeaderStatic}>
          {stageTitle}
          {taskCount}
        </div>
      )}
      {expanded ? table : null}
    </section>
  );
}
