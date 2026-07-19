import { getCrmDataSource } from '@/infrastructure/config/crmDataSource';
import { crmApiGetJson } from '@/infrastructure/crm/api/crmApiClient';
import type {
  CrmMyTaskAssigneeScope,
  CrmMyTaskAssignment,
  CrmMyTasksResponse,
} from '@/domain/crm/myTaskAssignment';
import { listMockCrmMyTasks } from '@/infrastructure/crm/mock/listMockCrmMyTasks';

export async function fetchCrmMyTasks(
  assigneeScope: CrmMyTaskAssigneeScope = 'mine'
): Promise<CrmMyTasksResponse> {
  if (getCrmDataSource() === 'mock') {
    return listMockCrmMyTasks(assigneeScope);
  }
  const query = new URLSearchParams({ assigneeScope });
  return crmApiGetJson<CrmMyTasksResponse>(`/api/crm/my-tasks?${query.toString()}`);
}

export async function fetchCrmMyTask(taskId: string): Promise<CrmMyTaskAssignment | null> {
  const trimmed = taskId.trim();
  if (!trimmed) return null;
  if (getCrmDataSource() === 'mock') {
    const all = await listMockCrmMyTasks('everyone');
    return all.tasks.find((task) => task.taskId === trimmed) ?? null;
  }
  try {
    const body = await crmApiGetJson<{ task: CrmMyTaskAssignment }>(
      `/api/crm/my-tasks/${encodeURIComponent(trimmed)}`
    );
    return body.task;
  } catch {
    return null;
  }
}
