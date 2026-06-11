import type { WorkflowTaskStatus } from './workflowTask';
import { isWorkflowTaskStatus } from './workflowTaskStatuses';

export type CrmProjectWorkflowTaskStatusIndex = ReadonlyMap<
  string,
  ReadonlySet<WorkflowTaskStatus>
>;

const EMPTY_WORKFLOW_TASK_STATUS_SET: ReadonlySet<WorkflowTaskStatus> = new Set();

export function getWorkflowTaskStatusesForProject(
  index: CrmProjectWorkflowTaskStatusIndex,
  projectId: string
): ReadonlySet<WorkflowTaskStatus> {
  return index.get(projectId) ?? EMPTY_WORKFLOW_TASK_STATUS_SET;
}

/** OR semantics: true when any selected status exists on at least one project task. */
export function projectHasAnyWorkflowTaskStatus(
  projectId: string,
  selectedStatuses: readonly WorkflowTaskStatus[],
  index: CrmProjectWorkflowTaskStatusIndex
): boolean {
  if (selectedStatuses.length === 0) return true;

  const projectStatuses = index.get(projectId);
  if (projectStatuses == null || projectStatuses.size === 0) return false;

  return selectedStatuses.some((status) => projectStatuses.has(status));
}

export function buildWorkflowTaskStatusIndexFromRows(
  rows: readonly { readonly projectId: string; readonly status: string }[]
): CrmProjectWorkflowTaskStatusIndex {
  const index = new Map<string, Set<WorkflowTaskStatus>>();

  for (const row of rows) {
    if (!isWorkflowTaskStatus(row.status)) continue;

    const statuses = index.get(row.projectId) ?? new Set<WorkflowTaskStatus>();
    statuses.add(row.status);
    index.set(row.projectId, statuses);
  }

  return index;
}

export function deserializeWorkflowTaskStatusIndex(
  byProjectId: Readonly<Record<string, readonly WorkflowTaskStatus[]>>
): CrmProjectWorkflowTaskStatusIndex {
  return new Map(
    Object.entries(byProjectId).map(([projectId, statuses]) => [projectId, new Set(statuses)])
  );
}

export function serializeWorkflowTaskStatusIndex(
  index: CrmProjectWorkflowTaskStatusIndex
): Record<string, WorkflowTaskStatus[]> {
  return Object.fromEntries(
    [...index.entries()].map(([projectId, statuses]) => [projectId, [...statuses]])
  );
}
