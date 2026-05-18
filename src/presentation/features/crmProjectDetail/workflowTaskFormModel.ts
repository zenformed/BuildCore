import {
  isPaymentWorkflowTask,
  PAYMENT_WORKFLOW_STAGE_SLUG,
  type CrmWorkflowTask,
  type PipelineStageSlug,
  type WorkflowTaskStatus,
} from '@/domain/crm';
import type { CreateCrmWorkflowTaskInput, UpdateCrmWorkflowTaskInput } from '@/domain/crm';
import { parseUsdInputToCents } from '@/presentation/features/crmCreate/createCrmProjectFormModel';
import {
  validateWorkflowTaskStatusChange,
  WORKFLOW_TASK_DONE_REQUIRES_DOCUMENTS_MESSAGE,
} from '@/presentation/features/crmProjectDetail/workflowTaskDocumentsValidation';

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

export function defaultPaymentMilestoneFormState(): WorkflowTaskFormState {
  return {
    ...defaultWorkflowTaskFormState(PAYMENT_WORKFLOW_STAGE_SLUG),
    taskKind: 'payment',
    stageSlug: PAYMENT_WORKFLOW_STAGE_SLUG,
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

export type ValidateWorkflowTaskFormOptions = {
  /** Uploaded document count for the task (edit mode). */
  docCount?: number;
};

export function validateWorkflowTaskForm(
  form: WorkflowTaskFormState,
  options: ValidateWorkflowTaskFormOptions = {}
): { ok: true; body: Omit<CreateCrmWorkflowTaskInput, 'projectId' | 'projectSlug'> } | { ok: false; message: string } {
  const title = form.title.trim();
  if (!title) return { ok: false, message: 'Task title is required.' };

  const documentsRequired = form.documentsRequired === 'yes';
  const docCount = options.docCount ?? 0;
  if (
    form.status === 'done' &&
    documentsRequired &&
    !validateWorkflowTaskStatusChange({ documentsRequired: true }, 'done', docCount).ok
  ) {
    return { ok: false, message: WORKFLOW_TASK_DONE_REQUIRES_DOCUMENTS_MESSAGE };
  }

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
  form: WorkflowTaskFormState,
  options: ValidateWorkflowTaskFormOptions = {}
): UpdateCrmWorkflowTaskInput {
  const validated = validateWorkflowTaskForm(form, options);
  if (!validated.ok) throw new Error(validated.message);
  return { taskId, ...validated.body };
}
