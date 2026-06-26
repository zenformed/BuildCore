'use client';

import type { DragEvent, ReactElement } from 'react';
import { useMemo } from 'react';
import type { CrmTeamMemberRef, CrmWorkflowTask } from '@/domain/crm';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import {
  setWorkflowTaskAssigneeDragData,
  useOptionalWorkflowTaskAssigneeDrag,
} from '@/presentation/features/crmProjectDetail/workflowTaskAssigneeDragContext';
import {
  useAssignmentIdentityCatalog,
  useAssignmentIdentityState,
} from '@/presentation/providers/AssignmentIdentityProvider';
import { TeamMemberAvatar } from './TeamMemberAvatar';
import styles from './ProjectDetail.module.css';

export type WorkflowUsersColumnProps = {
  readonly tasks: readonly CrmWorkflowTask[];
  readonly canAssignTasks?: boolean;
};

function countWorkflowTasksByAssigneeId(
  tasks: readonly CrmWorkflowTask[]
): ReadonlyMap<string, number> {
  const counts = new Map<string, number>();
  for (const task of tasks) {
    const assigneeId = task.assignedTo?.id;
    if (assigneeId == null || assigneeId === '') continue;
    counts.set(assigneeId, (counts.get(assigneeId) ?? 0) + 1);
  }
  return counts;
}

function setAssigneeDragPreview(event: DragEvent<HTMLDivElement>): void {
  const source = event.currentTarget;
  const dragPreview = source.cloneNode(true) as HTMLDivElement;
  dragPreview.classList.add(styles.workflowUsersColumnRow_dragPreview);
  dragPreview.style.position = 'fixed';
  dragPreview.style.top = '-9999px';
  dragPreview.style.left = '-9999px';
  dragPreview.style.pointerEvents = 'none';
  document.body.appendChild(dragPreview);
  event.dataTransfer.setDragImage(
    dragPreview,
    Math.min(dragPreview.offsetWidth * 0.5, 80),
    dragPreview.offsetHeight / 2
  );
  window.requestAnimationFrame(() => {
    dragPreview.remove();
  });
}

export function WorkflowUsersColumn({
  tasks,
  canAssignTasks = false,
}: WorkflowUsersColumnProps): ReactElement {
  const wf = content.projectDetail.workflow;
  const catalog = useAssignmentIdentityCatalog();
  const { isLoading } = useAssignmentIdentityState();
  const assigneeDrag = useOptionalWorkflowTaskAssigneeDrag();
  const canDragUsers = canAssignTasks && assigneeDrag != null;

  const taskCountsByAssigneeId = useMemo(() => countWorkflowTasksByAssigneeId(tasks), [tasks]);

  const members = useMemo(() => {
    const assignable = catalog?.assignableMembers ?? [];
    return [...assignable].sort((a, b) =>
      a.displayName.localeCompare(b.displayName, undefined, { sensitivity: 'base' })
    );
  }, [catalog?.assignableMembers]);

  const handleDragStart = (event: DragEvent<HTMLDivElement>, member: CrmTeamMemberRef): void => {
    if (!canDragUsers || assigneeDrag == null) return;
    setWorkflowTaskAssigneeDragData(event.dataTransfer, member);
    assigneeDrag.setDraggedMember(member);
    setAssigneeDragPreview(event);
  };

  const handleDragEnd = (): void => {
    assigneeDrag?.setDraggedMember(null);
  };

  return (
    <aside className={styles.workflowUsersColumn} aria-labelledby="workflow-users-column-heading">
      <div className={styles.workflowUsersColumnHeader}>
        <h4 id="workflow-users-column-heading" className={styles.workflowUsersColumnTitle}>
          {wf.usersColumn}
        </h4>
      </div>
      <div className={styles.workflowUsersColumnList}>
        {isLoading && members.length === 0 ? (
          <p className={styles.workflowUsersColumnEmpty}>{wf.usersColumnLoading}</p>
        ) : members.length === 0 ? (
          <p className={styles.workflowUsersColumnEmpty}>{wf.usersColumnEmpty}</p>
        ) : (
          members.map((member) => {
            const taskCount = taskCountsByAssigneeId.get(member.id) ?? 0;
            const taskCountLabel = wf.usersColumnTaskCount(taskCount);
            const isDragging = assigneeDrag?.draggedMember?.id === member.id;
            const rowClass = [
              styles.workflowUsersColumnRow,
              canDragUsers ? styles.workflowUsersColumnRow_draggable : '',
              isDragging ? styles.workflowUsersColumnRow_dragging : '',
            ]
              .filter(Boolean)
              .join(' ');

            return (
              <div
                key={member.id}
                className={rowClass}
                title={
                  canDragUsers
                    ? `${member.displayName} · ${taskCountLabel} · ${wf.usersColumnDragHint}`
                    : `${member.displayName} · ${taskCountLabel}`
                }
                draggable={canDragUsers}
                onDragStart={(event) => handleDragStart(event, member)}
                onDragEnd={handleDragEnd}
              >
                <span className={styles.workflowUsersColumnAvatar}>
                  <TeamMemberAvatar member={member} />
                </span>
                <span className={styles.workflowUsersColumnName}>{member.displayName}</span>
                <span className={styles.stageGroupCount}>{taskCountLabel}</span>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
