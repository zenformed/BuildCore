'use client';

import type { ReactElement, CSSProperties } from 'react';
import { useMemo } from 'react';
import type { CrmProjectStageCompletion, CrmWorkflowTask } from '@/domain/crm';
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
import { BulkSelectCheckbox } from '@/presentation/components/BulkSelection/BulkSelectCheckbox';
import { WorkflowTaskInlineRow } from './WorkflowTaskInlineRow';
import { WorkflowTaskTableHeaderRow } from './WorkflowTaskTableHeaderRow';
import { WorkflowTaskTableCustomColumnEmptyCells, resolveWorkflowOpsGridClassName } from './WorkflowTaskTableCustomColumns';
import { useBuildCoreWorkflowTaskTableColumns } from '@/presentation/providers/BuildCoreWorkflowTaskTableColumnsProvider';
import { useWorkflowTaskRowSelection } from '@/presentation/features/crmProjectDetail/workflowTaskRowSelectionContext';
import { useProjectDetailShell } from '@/presentation/features/crmProjectDetail/ProjectDetailShellContext';
import { WorkflowTableBulkActions } from './WorkflowTableBulkActions';
import styles from './ProjectDetail.module.css';

/** @deprecated Manual stage completion toggle removed. */
export type ManualStageCompletionToggleAction = 'complete' | 'incomplete';

export type WorkflowStageTaskGroupProps = {
  projectSlug: string;
  projectDocuments: readonly import('@/domain/crm').CrmDocumentMetadata[];
  group: WorkflowTaskStageGroup;
  /** @deprecated Ignored for stage visual completion — retained for call-site compatibility. */
  manualStageCompletions?: readonly CrmProjectStageCompletion[];
  docCounts: ReadonlyMap<string, number>;
  isApiSource: boolean;
  onTaskUpdated: (task: CrmWorkflowTask) => Promise<void>;
  onTaskError?: (message: string) => void;
  onRequestArchiveTask?: (task: CrmWorkflowTask) => void;
  /** @deprecated Manual stage completion removed. */
  onRequestToggleManualStageCompletion?: unknown;
  /** @deprecated Manual stage completion removed. */
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
  /** Temporary Monday-style left accent color for this stage. */
  accentColor?: string;
};

export function WorkflowStageTaskGroup({
  projectSlug,
  projectDocuments,
  group,
  manualStageCompletions = [],
  docCounts,
  isApiSource,
  onTaskUpdated,
  onTaskError,
  onRequestArchiveTask,
  collapsible = true,
  showStageHeader = true,
  resolveTaskProjectSlug,
  taskContextLineById,
  forceExpanded = false,
  useCardLayout,
  layoutAsStageCard = false,
  unifiedDesktopTable = false,
  draftRow = null,
  accentColor,
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
    /* Card mode: accent wraps header + body. Table mode: accent stays on the inner table. */
    showCardLayout && accentColor ? styles.stageGroup_accentBorder : '',
  ]
    .filter(Boolean)
    .join(' ');
  const tasksAccentClass =
    accentColor && !showCardLayout ? styles.stageGroup_accentBorder : '';
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
  const stageTaskIds = useMemo(() => group.tasks.map((task) => task.id), [group.tasks]);
  const stageAllSelected =
    showRowSelect &&
    stageTaskIds.length > 0 &&
    stageTaskIds.every((id) => rowSelection.selectedIds.has(id));
  const stageSomeSelected =
    showRowSelect &&
    stageTaskIds.some((id) => rowSelection.selectedIds.has(id)) &&
    !stageAllSelected;
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

  const handleToggleStageSelection = (checked: boolean): void => {
    if (rowSelection == null || stageTaskIds.length === 0) return;
    if (checked) {
      rowSelection.selectMany(stageTaskIds);
    } else {
      rowSelection.deselectMany(stageTaskIds);
    }
  };

  // Green check only when stage has ≥1 task and all are complete (shared task rule).
  const completeIconControl = stageIsComplete ? (
    <span
      className={styles.stageGroupCompleteIcon}
      title={wf.stageAllDone}
      aria-label={wf.stageAllDone}
    >
      <BsCheckLg className={styles.stageGroupCompleteCheck_done} size={17} aria-hidden />
    </span>
  ) : null;

  const taskCount = (
    <span className={styles.stageGroupCount}>
      {taskCountText} · {completionPercentLabel}
    </span>
  );

  const stageSelectControl =
    unifiedDesktopTable && showRowSelect ? (
      <span
        className={styles.stageGroupSelect}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
      >
        <BulkSelectCheckbox
          checked={stageAllSelected}
          indeterminate={stageSomeSelected}
          disabled={stageTaskIds.length === 0}
          ariaLabel={`${rowSelection.selectAllAriaLabel}: ${group.stageLabel}`}
          onChange={handleToggleStageSelection}
        />
      </span>
    ) : null;

  const hasStageSelection = stageAllSelected || stageSomeSelected;
  const showMobileRightTaskCount = isMobileLayout && !group.isPaymentsGroup;

  const stageTitle = (
    <span className={styles.stageGroupTitle}>
      <span className={styles.stageGroupName}>{group.stageLabel}</span>
      {!hasStageSelection && !showMobileRightTaskCount ? taskCount : null}
      {!hasStageSelection && collapsible && !showCardLayout ? (
        <span className={styles.stageGroupChevronWrap} aria-hidden>
          <span className={expanded ? styles.stageGroupChevron_expanded : styles.stageGroupChevron} />
        </span>
      ) : null}
    </span>
  );

  const stagePrimaryControl = (
    <span className={styles.stageGroupPrimary}>
      <span className={styles.stageGroupPrimaryCluster}>
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
            {!hasStageSelection && showMobileRightTaskCount ? (
              <span className={`${styles.stageGroupCount} ${styles.stageGroupCount_mobileRight}`}>
                {taskCountText} · {completionPercentLabel}
              </span>
            ) : null}
          </button>
        ) : (
          <div className={styles.stageGroupHeaderStatic}>
            {stageTitle}
            {!hasStageSelection && showMobileRightTaskCount ? (
              <span className={`${styles.stageGroupCount} ${styles.stageGroupCount_mobileRight}`}>
                {taskCountText} · {completionPercentLabel}
              </span>
            ) : null}
          </div>
        )}
        {hasStageSelection ? (
          <span
            className={styles.stageGroupHeaderBulk}
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
          >
            <WorkflowTableBulkActions />
          </span>
        ) : null}
      </span>
    </span>
  );

  const renderTaskRows = (): ReactElement => (
    <>
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
          {/* Docs | Assigned | Due | Actions — must match workflowGrid column count (no extra cell or the row wraps). */}
          <span className={styles.workflowStageEmptyCell} aria-hidden />
          <span className={styles.workflowStageEmptyCell} aria-hidden />
          <span className={styles.workflowStageEmptyCell} aria-hidden />
          <span className={styles.taskDeleteCell} aria-hidden />
        </div>
      ) : null}
      {draftRow}
    </>
  );

  const legacyHeader = (
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
          {!hasStageSelection && showMobileRightTaskCount ? (
            <span className={`${styles.stageGroupCount} ${styles.stageGroupCount_mobileRight}`}>
              {taskCountText} · {completionPercentLabel}
            </span>
          ) : null}
        </button>
      ) : (
        <div className={styles.stageGroupHeaderStatic}>
          {stageTitle}
          {!hasStageSelection && showMobileRightTaskCount ? (
            <span className={`${styles.stageGroupCount} ${styles.stageGroupCount_mobileRight}`}>
              {taskCountText} · {completionPercentLabel}
            </span>
          ) : null}
        </div>
      )}
    </div>
  );

  const table = showCardLayout ? (
    <div
      id={panelId}
      className={[styles.stageGroupMobileTaskList, tasksAccentClass].filter(Boolean).join(' ')}
    >
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
  ) : unifiedDesktopTable ? (
    <div
      id={panelId}
      className={[styles.stageGroupTable, tasksAccentClass].filter(Boolean).join(' ')}
    >
      {showStageHeader ? (
        <WorkflowTaskTableHeaderRow
          showAmount={group.isPaymentsGroup}
          enableCustomColumns={enableCustomColumns}
          gridClassName={enableCustomColumns ? gridClass : undefined}
          rowClassName={styles.stageGroupUnifiedHeaderRow}
          stageHeaderSelect={showRowSelect ? stageSelectControl : false}
          stageHeaderPrimary={stagePrimaryControl}
        />
      ) : null}
      {expanded || !showStageHeader ? renderTaskRows() : null}
    </div>
  ) : (
    <div
      id={panelId}
      className={[styles.stageGroupTable, tasksAccentClass].filter(Boolean).join(' ')}
    >
      <WorkflowTaskTableHeaderRow
        showAmount={group.isPaymentsGroup}
        enableCustomColumns={enableCustomColumns}
        showStatusRefresh={!group.isPaymentsGroup}
        gridClassName={enableCustomColumns ? gridClass : undefined}
      />
      {renderTaskRows()}
    </div>
  );

  return (
    <section
      className={groupClass}
      aria-label={group.stageLabel}
      style={
        accentColor
          ? ({ ['--stage-accent' as string]: accentColor } as CSSProperties)
          : undefined
      }
    >
      {!unifiedDesktopTable && showStageHeader ? legacyHeader : null}
      {expanded || !showStageHeader || unifiedDesktopTable ? table : null}
    </section>
  );
}
