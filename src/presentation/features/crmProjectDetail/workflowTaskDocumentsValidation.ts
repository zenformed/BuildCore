import type { CrmWorkflowTask, WorkflowTaskStatus } from '@/domain/crm';

export const WORKFLOW_TASK_DONE_REQUIRES_DOCUMENTS_MESSAGE =
  'Documents are required before this task can be completed.';

export function taskHasUploadedDocuments(docCount: number): boolean {
  return docCount > 0;
}

export function canMarkWorkflowTaskDone(
  task: Pick<CrmWorkflowTask, 'documentsRequired'>,
  docCount: number
): boolean {
  if (!task.documentsRequired) return true;
  return taskHasUploadedDocuments(docCount);
}

export function validateWorkflowTaskStatusChange(
  task: Pick<CrmWorkflowTask, 'documentsRequired'>,
  nextStatus: WorkflowTaskStatus,
  docCount: number
): { ok: true } | { ok: false; message: string } {
  if (nextStatus === 'done' && !canMarkWorkflowTaskDone(task, docCount)) {
    return { ok: false, message: WORKFLOW_TASK_DONE_REQUIRES_DOCUMENTS_MESSAGE };
  }
  return { ok: true };
}
