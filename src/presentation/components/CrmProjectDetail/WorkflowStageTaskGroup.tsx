'use client';

import type { ReactElement } from 'react';
import type { CrmWorkflowTask } from '@/domain/crm';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import {
  areAllStageTasksDone,
  type WorkflowTaskStageGroup,
} from '@/presentation/features/crmProjectDetail/workflowTaskGroups';
import { useWorkflowStageExpanded } from '@/presentation/features/crmProjectDetail/useWorkflowStageExpanded';
import { WorkflowTaskInlineRow } from './WorkflowTaskInlineRow';
import styles from './ProjectDetail.module.css';

export type WorkflowStageTaskGroupProps = {
  projectSlug: string;
  group: WorkflowTaskStageGroup;
  docCounts: ReadonlyMap<string, number>;
  isApiSource: boolean;
  onTaskUpdated: () => Promise<void>;
  onUploadComingSoon: () => void;
  onTaskError?: (message: string) => void;
  onRequestArchiveTask?: (task: CrmWorkflowTask) => void;
  /** When false, stage is always expanded with a static header (e.g. "View all" modal). */
  collapsible?: boolean;
};

export function WorkflowStageTaskGroup({
  projectSlug,
  group,
  docCounts,
  isApiSource,
  onTaskUpdated,
  onUploadComingSoon,
  onTaskError,
  onRequestArchiveTask,
  collapsible = true,
}: WorkflowStageTaskGroupProps): ReactElement {
  const cols = content.projectDetail.workflow.columns;
  const wf = content.projectDetail.workflow;
  const persisted = useWorkflowStageExpanded(projectSlug, group.collapseKey);
  const expanded = collapsible ? persisted.expanded : true;
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
  const allTasksDone = areAllStageTasksDone(group.tasks);

  const stageTitle = (
    <span className={styles.stageGroupTitle}>
      {allTasksDone ? (
        <span className={styles.stageGroupDoneBadge} title={wf.stageAllDone} aria-label={wf.stageAllDone}>
          <span className={styles.taskDoneIcon}>✓</span>
        </span>
      ) : null}
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
      {group.tasks.length} {group.tasks.length === 1 ? wf.taskSingular : wf.taskPlural}
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
          task={task}
          docCount={docCounts.get(task.id) ?? 0}
          showAmountColumn={group.isPaymentsGroup}
          isApiSource={isApiSource}
          onUpdated={onTaskUpdated}
          onUploadComingSoon={onUploadComingSoon}
          onTaskError={onTaskError}
          onRequestArchiveTask={onRequestArchiveTask}
        />
      ))}
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
