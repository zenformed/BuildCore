'use client';

import type { ReactElement } from 'react';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import type { WorkflowTaskStageGroup } from '@/presentation/features/crmProjectDetail/workflowTaskGroups';
import { useWorkflowStageExpanded } from '@/presentation/features/crmProjectDetail/useWorkflowStageExpanded';
import { WorkflowTaskInlineRow } from './WorkflowTaskInlineRow';
import styles from './ProjectDetail.module.css';

export type WorkflowStageTaskGroupProps = {
  projectSlug: string;
  group: WorkflowTaskStageGroup;
  isCurrentStage: boolean;
  docCounts: ReadonlyMap<string, number>;
  isApiSource: boolean;
  onTaskUpdated: () => Promise<void>;
  onUploadComingSoon: () => void;
  onTaskError?: (message: string) => void;
  /** When false, stage is always expanded with a static header (e.g. "View all" modal). */
  collapsible?: boolean;
};

export function WorkflowStageTaskGroup({
  projectSlug,
  group,
  isCurrentStage,
  docCounts,
  isApiSource,
  onTaskUpdated,
  onUploadComingSoon,
  onTaskError,
  collapsible = true,
}: WorkflowStageTaskGroupProps): ReactElement {
  const cols = content.projectDetail.workflow.columns;
  const wf = content.projectDetail.workflow;
  const persisted = useWorkflowStageExpanded(projectSlug, group.stageSlug);
  const expanded = collapsible ? persisted.expanded : true;
  const groupClass = [
    styles.stageGroup,
    isCurrentStage ? styles.stageGroup_current : '',
    collapsible && !expanded ? styles.stageGroup_collapsed : '',
  ]
    .filter(Boolean)
    .join(' ');
  const panelId = `workflow-stage-${projectSlug}-${group.stageSlug}`;

  const taskCount = (
    <span className={styles.stageGroupCount}>
      {group.tasks.length} {group.tasks.length === 1 ? wf.taskSingular : wf.taskPlural}
    </span>
  );

  const table = (
    <div id={panelId} className={styles.stageGroupTable}>
      <div className={`${styles.tableHeader} ${styles.workflowGrid}`} role="row">
        <span role="columnheader">{cols.task}</span>
        <span role="columnheader">{cols.status}</span>
        <span role="columnheader">{cols.documents}</span>
        <span role="columnheader">{cols.assigned}</span>
        <span role="columnheader">{cols.due}</span>
      </div>
      {group.tasks.map((task) => (
        <WorkflowTaskInlineRow
          key={task.id}
          task={task}
          docCount={docCounts.get(task.id) ?? 0}
          isApiSource={isApiSource}
          onUpdated={onTaskUpdated}
          onUploadComingSoon={onUploadComingSoon}
          onTaskError={onTaskError}
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
          <span className={styles.stageGroupTitle}>
            <span className={styles.stageGroupName}>{group.stageLabel}</span>
            <span className={styles.stageGroupChevronWrap} aria-hidden>
              <span className={expanded ? styles.stageGroupChevron_expanded : styles.stageGroupChevron} />
            </span>
          </span>
          {taskCount}
        </button>
      ) : (
        <div className={styles.stageGroupHeaderStatic}>
          <span className={styles.stageGroupTitle}>
            <span className={styles.stageGroupName}>{group.stageLabel}</span>
          </span>
          {taskCount}
        </div>
      )}
      {expanded ? table : null}
    </section>
  );
}
