import type { CreateCrmWorkflowTaskInput, UpdateCrmWorkflowTaskInput } from '@/domain/crm';
import { DEFAULT_PIPELINE_STAGES, type PipelineStageSlug } from '@/domain/crm';
import type { WorkflowTaskStatus } from '@/domain/crm';

const STAGE_SLUGS = new Set(DEFAULT_PIPELINE_STAGES.map((s) => s.slug));
const STATUSES: readonly WorkflowTaskStatus[] = ['pending', 'in_progress', 'blocked', 'done', 'skipped'];

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

function asStageSlug(value: unknown): PipelineStageSlug | null {
  if (typeof value !== 'string') return null;
  return STAGE_SLUGS.has(value as PipelineStageSlug) ? (value as PipelineStageSlug) : null;
}

function asStatus(value: unknown): WorkflowTaskStatus | null {
  if (typeof value !== 'string') return null;
  return (STATUSES as readonly string[]).includes(value) ? (value as WorkflowTaskStatus) : null;
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

export function validateCreateWorkflowTaskBody(
  body: WorkflowTaskBody
): { ok: true; input: Omit<CreateCrmWorkflowTaskInput, 'projectId'> } | { ok: false; message: string } {
  const title = asNonEmptyString(body.title);
  if (!title) return { ok: false, message: 'Task title is required.' };

  const stageSlug = asStageSlug(body.stageSlug);
  if (!stageSlug) return { ok: false, message: 'Stage is invalid.' };

  const status = asStatus(body.status);
  if (!status) return { ok: false, message: 'Status is invalid.' };

  return {
    ok: true,
    input: {
      title,
      stageSlug,
      status,
      dueAt: asIsoOrNull(body.dueAt),
      notes: asOptionalString(body.notes),
      assignedMemberId: asOptionalUserId(body.assignedMemberId),
    },
  };
}

export function validateUpdateWorkflowTaskBody(
  body: WorkflowTaskBody
): { ok: true; patch: Omit<UpdateCrmWorkflowTaskInput, 'taskId'> } | { ok: false; message: string } {
  const patch: {
    title?: string;
    stageSlug?: PipelineStageSlug;
    status?: WorkflowTaskStatus;
    dueAt?: string | null;
    notes?: string | null;
    assignedMemberId?: string | null;
  } = {};

  if ('title' in body) {
    const title = asNonEmptyString(body.title);
    if (!title) return { ok: false, message: 'Task title cannot be empty.' };
    patch.title = title;
  }
  if ('stageSlug' in body) {
    const stageSlug = asStageSlug(body.stageSlug);
    if (!stageSlug) return { ok: false, message: 'Stage is invalid.' };
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

  if (Object.keys(patch).length === 0) {
    return { ok: false, message: 'No fields to update.' };
  }

  return { ok: true, patch };
}
