'use client';

import type { ReactElement, MouseEvent } from 'react';
import type { CrmProjectStageCompletion, CrmWorkflowTask, PipelineStageSlug } from '@/domain/crm';
import { isStageManuallyCompleted } from '@/domain/crm/projectStageCompletion';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { useDashboardMobileLayout } from '@/presentation/features/crmProjects/useDashboardMobileLayout';
import {
  formatWorkflowStageTaskCompletionPercent,
  isWorkflowStageGroupComplete,
  summarizeWorkflowStageTaskCompletion,
  type WorkflowTaskStageGroup,
} from '@/presentation/features/crmProjectDetail/workflowTaskGroups';
import { useWorkflowStageExpanded } from '@/presentation/features/crmProjectDetail/useWorkflowStageExpanded';
import { BsCheckLg } from 'react-icons/bs';
import { WorkflowTaskInlineRow } from './WorkflowTaskInlineRow';
import { WorkflowTaskTableHeaderRow } from './WorkflowTaskTableHeaderRow';
import { WorkflowTaskTableCustomColumnEmptyCells, resolveWorkflowOpsGridClassName } from './WorkflowTaskTableCustomColumns';
import { useBuildCoreWorkflowTaskTableColumns } from '@/presentation/providers/BuildCoreWorkflowTaskTableColumnsProvider';
import { useWorkflowTaskRowSelection } from '@/presentation/features/crmProjectDetail/workflowTaskRowSelectionContext';
import { useProjectDetailShell } from '@/presentation/features/crmProjectDetail/ProjectDetailShellContext';
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
  /** When false, omit the stage section header chrome entirely. */
  showStageHeader?: boolean;
  resolveTaskProjectSlug?: (taskId: string) => string;
  taskContextLineById?: ReadonlyMap<string, string>;
  /** Keep the stage expanded while composing an inline draft row. */
  forceExpanded?: boolean;
  /** When true, render tasks as stacked cards instead of the desktop table grid. */
  useCardLayout?: boolean;
  /** Desktop stage-card mode: this stage sits in a kanban-style column card. */
  layoutAsStageCard?: boolean;
  /** Desktop unified table: column headers render once at the parent; stages are flat sections. */
  unifiedDesktopTable?: boolean;
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
  showStageHeader = true,
  resolveTaskProjectSlug,
  taskContextLineById,
  forceExpanded = false,
  useCardLayout,
  layoutAsStageCard = false,
  unifiedDesktopTable = false,
  draftRow = null,
}: WorkflowStageTaskGroupProps): ReactElement {
  const wf = content.projectDetail.workflow;
  const isMobileLayout = useDashboardMobileLayout();
  const showCardLayout = useCardLayout ?? isMobileLayout;
  // Mobile uses labeled mobile cards; desktop "cards" view keeps the compact summary row.
  const taskRowVariant = isMobileLayout
    ? 'mobile'
    : showCardLayout || layoutAsStageCard
      ? 'compact'
      : 'table';
  const persisted = useWorkflowStageExpanded(projectSlug, group.collapseKey);
  const expanded = forceExpanded || (collapsible ? persisted.expanded : true);
  const groupClass = [
    unifiedDesktopTable ? styles.stageGroup_unifiedTableSection : styles.stageGroup,
    layoutAsStageCard ? styles.stageGroup_stageCardColumn : '',
    collapsible && !expanded ? styles.stageGroup_collapsed : '',
  ]
    .filter(Boolean)
    .join(' ');
  const panelId = `workflow-stage-${projectSlug}-${group.collapseKey}`;
  const { gridClassName } = useBuildCoreWorkflowTaskTableColumns();
  const rowSelection = useWorkflowTaskRowSelection();
  const { isMemberRole } = useProjectDetailShell();
  const showRowSelect = rowSelection != null && !group.isPaymentsGroup && !isMemberRole;
  const enableCustomColumns = !group.isPaymentsGroup && !showCardLayout;
  const gridClass = group.isPaymentsGroup
    ? `${styles.workflowGrid} ${styles.workflowGridPayments}`
    : enableCustomColumns
      ? resolveWorkflowOpsGridClassName(true, gridClassName)
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
    <BsCheckLg
      className={
        stageIsComplete
          ? styles.stageGroupCompleteCheck_done
          : styles.stageGroupCompleteCheck_pending
      }
      size={17}
      aria-hidden
    />
  );

  const completeIconControl = canToggleManualStageCompletion ? (
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
  );

  const stageTitle = (
    <span className={styles.stageGroupTitle}>
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

  const table = showCardLayout ? (
    <div id={panelId} className={styles.stageGroupMobileTaskList}>
      {group.tasks.map((task) => (
        <WorkflowTaskInlineRow
          key={task.id}
          variant={taskRowVariant}
          projectSlug={resolveTaskProjectSlug?.(task.id) ?? projectSlug}
          task={task}
          docCount={docCounts.get(task.id) ?? 0}
          taskDocuments={projectDocuments.filter((doc) => doc.workflowTaskId === task.id)}
          showAmountColumn={group.isPaymentsGroup}
          enableCustomColumns={enableCustomColumns}
          contextLine={taskContextLineById?.get(task.id) ?? null}
          isApiSource={isApiSource}
          onUpdated={onTaskUpdated}
          onTaskError={onTaskError}
          onRequestArchiveTask={onRequestArchiveTask}
        />
      ))}
      {showEmptyRow ? (
        <p className={styles.workflowStageMobileEmpty}>{wf.stageNoTasks}</p>
      ) : null}
      {draftRow}
    </div>
  ) : (
    <div id={panelId} className={styles.stageGroupTable}>
      {!unifiedDesktopTable ? (
        <WorkflowTaskTableHeaderRow
          showAmount={group.isPaymentsGroup}
          enableCustomColumns={enableCustomColumns}
          showStatusRefresh={!group.isPaymentsGroup}
          gridClassName={enableCustomColumns ? gridClass : undefined}
        />
      ) : null}
      {group.tasks.map((task) => (
        <WorkflowTaskInlineRow
          key={task.id}
          projectSlug={resolveTaskProjectSlug?.(task.id) ?? projectSlug}
          task={task}
          docCount={docCounts.get(task.id) ?? 0}
          taskDocuments={projectDocuments.filter((doc) => doc.workflowTaskId === task.id)}
          showAmountColumn={group.isPaymentsGroup}
          enableCustomColumns={enableCustomColumns}
          contextLine={taskContextLineById?.get(task.id) ?? null}
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
          {showRowSelect ? (
            <span className={styles.workflowSelectCell} aria-hidden />
          ) : null}
          {!group.isPaymentsGroup ? (
            <span className={styles.workflowStageEmptyMessage}>{wf.stageNoTasks}</span>
          ) : (
            <>
              <span className={styles.workflowStageEmptyCell} aria-hidden />
              <span className={styles.workflowStageEmptyMessage}>{wf.stageNoTasks}</span>
            </>
          )}
          {enableCustomColumns ? <WorkflowTaskTableCustomColumnEmptyCells /> : null}
          {group.isPaymentsGroup ? <span className={styles.workflowStageEmptyCell} aria-hidden /> : null}
          {isMemberRole && !group.isPaymentsGroup ? (
            <>
              <span className={styles.workflowStageEmptyCell} aria-hidden />
              <span className={styles.workflowStageEmptyCell} aria-hidden />
              <span className={styles.workflowStageEmptyCell} aria-hidden />
            </>
          ) : null}
          <span className={styles.workflowStageEmptyCell} aria-hidden />
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
      {showStageHeader ? (
        <div className={styles.stageGroupHeaderRow}>
          {completeIconControl}
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
        </div>
      ) : null}
      {expanded || !showStageHeader ? table : null}
    </section>
  );
}
