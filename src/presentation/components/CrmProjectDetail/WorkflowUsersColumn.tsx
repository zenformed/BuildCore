'use client';

import type { ReactElement } from 'react';
import { useMemo } from 'react';
import type { CrmWorkflowTask } from '@/domain/crm';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import {
  useAssignmentIdentityCatalog,
  useAssignmentIdentityState,
} from '@/presentation/providers/AssignmentIdentityProvider';
import { TeamMemberAvatar } from './TeamMemberAvatar';
import styles from './ProjectDetail.module.css';

export type WorkflowUsersColumnProps = {
  readonly tasks: readonly CrmWorkflowTask[];
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

export function WorkflowUsersColumn({ tasks }: WorkflowUsersColumnProps): ReactElement {
  const wf = content.projectDetail.workflow;
  const catalog = useAssignmentIdentityCatalog();
  const { isLoading } = useAssignmentIdentityState();

  const taskCountsByAssigneeId = useMemo(() => countWorkflowTasksByAssigneeId(tasks), [tasks]);

  const members = useMemo(() => {
    const assignable = catalog?.assignableMembers ?? [];
    return [...assignable].sort((a, b) =>
      a.displayName.localeCompare(b.displayName, undefined, { sensitivity: 'base' })
    );
  }, [catalog?.assignableMembers]);

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

            return (
              <div
                key={member.id}
                className={styles.workflowUsersColumnRow}
                title={`${member.displayName} · ${taskCountLabel}`}
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
