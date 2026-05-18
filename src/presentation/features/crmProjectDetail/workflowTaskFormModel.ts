import {
  isPaymentWorkflowTask,
  PAYMENT_WORKFLOW_STAGE_SLUG,
  type CrmWorkflowTask,
  type PipelineStageSlug,
  type WorkflowTaskStatus,
} from '@/domain/crm';
import type { CreateCrmWorkflowTaskInput, UpdateCrmWorkflowTaskInput } from '@/domain/crm';
import { parseUsdInputToCents } from '@/presentation/features/crmCreate/createCrmProjectFormModel';

export type DocumentsRequiredChoice = 'yes' | 'no';
export type WorkflowTaskKind = 'standard' | 'payment';

export type WorkflowTaskFormState = {
  title: string;
  taskKind: WorkflowTaskKind;
  stageSlug: PipelineStageSlug;
  status: WorkflowTaskStatus;
  documentsRequired: DocumentsRequiredChoice;
  dueAt: string;
  notes: string;
  assignedMemberId: string;
  amountUsd: string;
};

export function centsToUsdInput(cents: number | null): string {
  if (cents == null) return '';
  return (cents / 100).toFixed(2);
}

export function defaultWorkflowTaskFormState(
  stageSlug: PipelineStageSlug
): WorkflowTaskFormState {
  return {
    title: '',
    taskKind: 'standard',
    stageSlug,
    status: 'pending',
    documentsRequired: 'yes',
    dueAt: '',
    notes: '',
    assignedMemberId: '',
    amountUsd: '',
  };
}

export function workflowTaskToFormState(task: CrmWorkflowTask): WorkflowTaskFormState {
  const isPayment = isPaymentWorkflowTask(task);
  return {
    title: task.title,
    taskKind: isPayment ? 'payment' : 'standard',
    stageSlug: isPayment ? PAYMENT_WORKFLOW_STAGE_SLUG : task.stageSlug,
    status: task.status,
    documentsRequired: task.documentsRequired ? 'yes' : 'no',
    dueAt: task.dueAt ? task.dueAt.slice(0, 10) : '',
    notes: task.notes ?? '',
    assignedMemberId: task.assignedTo?.id ?? '',
    amountUsd: centsToUsdInput(task.amountCents),
  };
}

export function validateWorkflowTaskForm(
  form: WorkflowTaskFormState
): { ok: true; body: Omit<CreateCrmWorkflowTaskInput, 'projectId' | 'projectSlug'> } | { ok: false; message: string } {
  const title = form.title.trim();
  if (!title) return { ok: false, message: 'Task title is required.' };

  if (form.taskKind === 'payment') {
    if (!form.amountUsd.trim()) {
      return { ok: false, message: 'Payment milestone amount is required.' };
    }
    const amountCents = parseUsdInputToCents(form.amountUsd);
    if (amountCents == null || amountCents < 0) {
      return { ok: false, message: 'Enter a valid payment amount.' };
    }
    return {
      ok: true,
      body: {
        title,
        stageSlug: PAYMENT_WORKFLOW_STAGE_SLUG,
        status: form.status,
        documentsRequired: form.documentsRequired === 'yes',
        dueAt: form.dueAt.trim() ? `${form.dueAt.trim()}T12:00:00.000Z` : null,
        notes: form.notes.trim() || null,
        assignedMemberId: form.assignedMemberId.trim() || null,
        amountCents,
      },
    };
  }

  return {
    ok: true,
    body: {
      title,
      stageSlug: form.stageSlug,
      status: form.status,
      documentsRequired: form.documentsRequired === 'yes',
      dueAt: form.dueAt.trim() ? `${form.dueAt.trim()}T12:00:00.000Z` : null,
      notes: form.notes.trim() || null,
      assignedMemberId: form.assignedMemberId.trim() || null,
      amountCents: null,
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
