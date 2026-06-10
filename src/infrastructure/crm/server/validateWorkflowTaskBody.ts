import type { CreateCrmWorkflowTaskInput, UpdateCrmWorkflowTaskInput } from '@/domain/crm';
import { isInternalWorkflowStageSlug } from '@/domain/buildcore/orgPipelineStages';
import {
  PAYMENT_WORKFLOW_STAGE_SLUG,
  pipelineStageSlugSet,
  type PipelineStageSlug,
} from '@/domain/crm';
import type { WorkflowTaskStatus } from '@/domain/crm';
import { isWorkflowTaskStatus } from '@/domain/crm/workflowTaskStatuses';

export type WorkflowTaskBody = Record<string, unknown>;

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asOptionalString(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asStageSlug(
  value: unknown,
  allowedStageSlugs: ReadonlySet<string>
): PipelineStageSlug | null {
  if (typeof value !== 'string') return null;
  return allowedStageSlugs.has(value) ? value : null;
}

function asStatus(value: unknown): WorkflowTaskStatus | null {
  if (typeof value !== 'string') return null;
  return isWorkflowTaskStatus(value) ? value : null;
}

function asOptionalUserId(value: unknown): string | null {
  if (value == null || value === '') return null;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asIsoOrNull(value: unknown): string | null {
  if (value == null || value === '') return null;
  if (typeof value !== 'string') return null;
  return value;
}

function asBoolean(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value;
  return null;
}

type ParsedAmountCents =
  | { kind: 'absent' }
  | { kind: 'null' }
  | { kind: 'value'; value: number }
  | { kind: 'invalid' };

function parseAmountCents(body: WorkflowTaskBody): ParsedAmountCents {
  if (!('amountCents' in body)) return { kind: 'absent' };
  const raw = body.amountCents;
  if (raw == null) return { kind: 'null' };
  if (typeof raw !== 'number' || !Number.isInteger(raw) || raw < 0) return { kind: 'invalid' };
  return { kind: 'value', value: raw };
}

export function validateCreateWorkflowTaskBody(
  body: WorkflowTaskBody,
  options?: { allowedStageSlugs?: ReadonlySet<string> }
): { ok: true; input: Omit<CreateCrmWorkflowTaskInput, 'projectId'> } | { ok: false; message: string } {
  const allowedStageSlugs = options?.allowedStageSlugs ?? pipelineStageSlugSet();
  const title = asNonEmptyString(body.title);
  if (!title) return { ok: false, message: 'Task title is required.' };

  const stageSlug = asStageSlug(body.stageSlug, allowedStageSlugs);
  if (!stageSlug) return { ok: false, message: 'Stage is invalid.' };
  if (isInternalWorkflowStageSlug(stageSlug)) {
    return { ok: false, message: 'Stage is invalid.' };
  }

  const status = asStatus(body.status);
  if (!status) return { ok: false, message: 'Status is invalid.' };

  const documentsRequired = asBoolean(body.documentsRequired);
  if (documentsRequired == null) {
    return { ok: false, message: 'Documents required must be true or false.' };
  }

  const parsedAmount = parseAmountCents(body);
  if (parsedAmount.kind === 'invalid') {
    return { ok: false, message: 'Enter a valid payment amount.' };
  }
  const amountCents = parsedAmount.kind === 'value' ? parsedAmount.value : null;

  return {
    ok: true,
    input: {
      title,
      stageSlug: amountCents != null ? PAYMENT_WORKFLOW_STAGE_SLUG : stageSlug,
      status,
      documentsRequired,
      dueAt: asIsoOrNull(body.dueAt),
      notes: asOptionalString(body.notes),
      assignedMemberId: asOptionalUserId(body.assignedMemberId),
      amountCents,
      ...(amountCents != null
        ? {
            invoicedAt: asIsoOrNull(body.invoicedAt),
            paidAt: asIsoOrNull(body.paidAt),
          }
        : {}),
    },
  };
}

export function validateUpdateWorkflowTaskBody(
  body: WorkflowTaskBody,
  options?: { allowedStageSlugs?: ReadonlySet<string> }
): { ok: true; patch: Omit<UpdateCrmWorkflowTaskInput, 'taskId'> } | { ok: false; message: string } {
  const allowedStageSlugs = options?.allowedStageSlugs ?? pipelineStageSlugSet();
  const patch: {
    title?: string;
    stageSlug?: PipelineStageSlug;
    status?: WorkflowTaskStatus;
    documentsRequired?: boolean;
    dueAt?: string | null;
    notes?: string | null;
    assignedMemberId?: string | null;
    amountCents?: number | null;
    invoicedAt?: string | null;
    paidAt?: string | null;
  } = {};

  if ('title' in body) {
    const title = asNonEmptyString(body.title);
    if (!title) return { ok: false, message: 'Task title cannot be empty.' };
    patch.title = title;
  }
  if ('stageSlug' in body) {
    const stageSlug = asStageSlug(body.stageSlug, allowedStageSlugs);
    if (!stageSlug) return { ok: false, message: 'Stage is invalid.' };
    if (isInternalWorkflowStageSlug(stageSlug)) {
      return { ok: false, message: 'Stage is invalid.' };
    }
    patch.stageSlug = stageSlug;
  }
  if ('status' in body) {
    const status = asStatus(body.status);
    if (!status) return { ok: false, message: 'Status is invalid.' };
    patch.status = status;
  }
  if ('dueAt' in body) patch.dueAt = asIsoOrNull(body.dueAt);
  if ('notes' in body) patch.notes = asOptionalString(body.notes);
  if ('assignedMemberId' in body) patch.assignedMemberId = asOptionalUserId(body.assignedMemberId);
  if ('documentsRequired' in body) {
    const documentsRequired = asBoolean(body.documentsRequired);
    if (documentsRequired == null) {
      return { ok: false, message: 'Documents required must be true or false.' };
    }
    patch.documentsRequired = documentsRequired;
  }
  if ('amountCents' in body) {
    const parsedAmount = parseAmountCents(body);
    if (parsedAmount.kind === 'invalid') {
      return { ok: false, message: 'Enter a valid payment amount.' };
    }
    const amountCents = parsedAmount.kind === 'value' ? parsedAmount.value : null;
    patch.amountCents = amountCents;
    if (amountCents != null) {
      patch.stageSlug = PAYMENT_WORKFLOW_STAGE_SLUG;
    }
  }
  if ('invoicedAt' in body) patch.invoicedAt = asIsoOrNull(body.invoicedAt);
  if ('paidAt' in body) patch.paidAt = asIsoOrNull(body.paidAt);

  if (Object.keys(patch).length === 0) {
    return { ok: false, message: 'No fields to update.' };
  }

  return { ok: true, patch };
}
