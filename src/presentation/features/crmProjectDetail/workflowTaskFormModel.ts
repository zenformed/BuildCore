import type { CrmWorkflowTask, PipelineStageSlug, WorkflowTaskStatus } from '@/domain/crm';
import type { CreateCrmWorkflowTaskInput, UpdateCrmWorkflowTaskInput } from '@/domain/crm';

export type WorkflowTaskFormState = {
  title: string;
  stageSlug: PipelineStageSlug;
  status: WorkflowTaskStatus;
  dueAt: string;
  notes: string;
  assignedMemberId: string;
};

export function defaultWorkflowTaskFormState(
  stageSlug: PipelineStageSlug
): WorkflowTaskFormState {
  return {
    title: '',
    stageSlug,
    status: 'pending',
    dueAt: '',
    notes: '',
    assignedMemberId: '',
  };
}

export function workflowTaskToFormState(task: CrmWorkflowTask): WorkflowTaskFormState {
  return {
    title: task.title,
    stageSlug: task.stageSlug,
    status: task.status,
    dueAt: task.dueAt ? task.dueAt.slice(0, 10) : '',
    notes: task.notes ?? '',
    assignedMemberId: task.assignedTo?.id ?? '',
  };
}

export function validateWorkflowTaskForm(
  form: WorkflowTaskFormState
): { ok: true; body: Omit<CreateCrmWorkflowTaskInput, 'projectId'> } | { ok: false; message: string } {
  const title = form.title.trim();
  if (!title) return { ok: false, message: 'Task title is required.' };
  return {
    ok: true,
    body: {
      title,
      stageSlug: form.stageSlug,
      status: form.status,
      dueAt: form.dueAt.trim() ? `${form.dueAt.trim()}T12:00:00.000Z` : null,
      notes: form.notes.trim() || null,
      assignedMemberId: form.assignedMemberId.trim() || null,
    },
  };
}

export function formToUpdateInput(
  taskId: string,
  form: WorkflowTaskFormState
): UpdateCrmWorkflowTaskInput {
  const validated = validateWorkflowTaskForm(form);
  if (!validated.ok) throw new Error(validated.message);
  return { taskId, ...validated.body };
}
