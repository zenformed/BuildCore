'use client';

import type { ReactElement } from 'react';
import type { CrmWorkflowTask, WorkflowTaskStatus } from '@/domain/crm';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import {
  formatShortDate,
  formatWorkflowStatus,
} from '@/presentation/features/crmProjectDetail/crmProjectDetailFormatters';
import type { WorkflowTaskStageGroup } from '@/presentation/features/crmProjectDetail/workflowTaskGroups';
import { useWorkflowStageExpanded } from '@/presentation/features/crmProjectDetail/useWorkflowStageExpanded';
import shared from '@/presentation/components/crmShared/crmShared.module.css';
import { TeamMemberAvatar } from './TeamMemberAvatar';
import styles from './ProjectDetail.module.css';

function statusBadgeClass(status: WorkflowTaskStatus): string {
  return shared[`statusBadge_${status}`] ?? shared.statusBadge_pending;
}

export type WorkflowStageTaskGroupProps = {
  projectSlug: string;
  group: WorkflowTaskStageGroup;
  isCurrentStage: boolean;
  docCounts: ReadonlyMap<string, number>;
  onEditTask: (task: CrmWorkflowTask) => void;
};

export function WorkflowStageTaskGroup({
  projectSlug,
  group,
  isCurrentStage,
  docCounts,
  onEditTask,
}: WorkflowStageTaskGroupProps): ReactElement {
  const cols = content.projectDetail.workflow.columns;
  const wf = content.projectDetail.workflow;
  const { expanded, toggle } = useWorkflowStageExpanded(projectSlug, group.stageSlug);
  const groupClass = [
    styles.stageGroup,
    isCurrentStage ? styles.stageGroup_current : '',
    expanded ? '' : styles.stageGroup_collapsed,
  ]
    .filter(Boolean)
    .join(' ');
  const panelId = `workflow-stage-${projectSlug}-${group.stageSlug}`;

  return (
    <section className={groupClass} aria-label={group.stageLabel}>
      <button
        type="button"
        className={styles.stageGroupHeaderBtn}
        onClick={toggle}
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
        <span className={styles.stageGroupCount}>
          {group.tasks.length} {group.tasks.length === 1 ? wf.taskSingular : wf.taskPlural}
        </span>
      </button>
      {expanded ? (
        <div id={panelId} className={styles.stageGroupTable}>
          <div className={`${styles.tableHeader} ${styles.workflowGrid}`} role="row">
            <span role="columnheader">{cols.task}</span>
            <span role="columnheader">{cols.status}</span>
            <span role="columnheader">{cols.documents}</span>
            <span role="columnheader">{cols.assigned}</span>
            <span role="columnheader">{cols.due}</span>
            <span role="columnheader">{cols.actions}</span>
          </div>
          {group.tasks.map((task) => {
            const docCount = docCounts.get(task.id) ?? 0;
            const rowClass =
              task.status === 'in_progress'
                ? `${styles.tableRow} ${styles.workflowGrid} ${styles.tableRow_active}`
                : `${styles.tableRow} ${styles.workflowGrid}`;
            return (
              <div key={task.id} className={rowClass} role="row">
                <span className={styles.taskTitleCell}>{task.title}</span>
                <span>
                  <span className={`${styles.statusPill} ${statusBadgeClass(task.status)}`}>
                    {formatWorkflowStatus(task.status)}
                  </span>
                </span>
                <span className={styles.documentsCell}>
                  {!task.documentsRequired ? (
                    <span className={styles.documentsNotRequired}>{wf.documentsNotRequired}</span>
                  ) : (
                    <>
                      <span className={styles.documentsIcon} aria-hidden />
                      {docCount === 0 ? (
                        <span className={styles.documentsCountMuted}>{wf.documentsNone}</span>
                      ) : (
                        <span>
                          {docCount} {wf.documentsCountSuffix}
                        </span>
                      )}
                    </>
                  )}
                </span>
                <span className={styles.assignedCell}>
                  {task.assignedTo ? (
                    <TeamMemberAvatar member={task.assignedTo} />
                  ) : (
                    <span
                      className={`${shared.avatar} ${shared.avatarUnassigned}`}
                      title={wf.unassigned}
                      aria-label={wf.unassigned}
                    >
                      —
                    </span>
                  )}
                </span>
                <span>{formatShortDate(task.dueAt)}</span>
                <span>
                  <button type="button" className={styles.rowActionBtn} onClick={() => onEditTask(task)}>
                    {wf.editTask}
                  </button>
                </span>
              </div>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
