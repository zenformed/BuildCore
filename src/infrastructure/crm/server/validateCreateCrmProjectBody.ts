import type { CreateCrmProjectInput } from '@/domain/crm/createProject';
import type { CrmPriority, CrmTradeType } from '@/domain/crm';
import { CRM_TRADE_TYPES, DEFAULT_PIPELINE_STAGES, type PipelineStageSlug } from '@/domain/crm';
import { parseProjectTemplateBlueprintsFromUnknown } from '@/infrastructure/crm/mappers/mapProjectTemplateFromDb';

const PRIORITIES: readonly CrmPriority[] = ['low', 'normal', 'high', 'urgent'];
const STAGE_SLUGS = new Set(DEFAULT_PIPELINE_STAGES.map((s) => s.slug));

export type CreateCrmProjectBody = {
  name?: unknown;
  contactName?: unknown;
  email?: unknown;
  phone?: unknown;
  priority?: unknown;
  tradeType?: unknown;
  currentStageSlug?: unknown;
  notes?: unknown;
  dealValueCents?: unknown;
  balanceRemainingCents?: unknown;
  assignedMemberId?: unknown;
  initialTemplateBlueprints?: unknown;
};

export type ValidateCreateCrmProjectResult =
  | { ok: true; input: CreateCrmProjectInput }
  | { ok: false; message: string };

function asNonEmptyString(value: unknown, field: string): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed;
}

function asOptionalString(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asCents(value: unknown, field: string): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  if (value < 0 || !Number.isInteger(value)) return null;
  return value;
}

function asPriority(value: unknown): CrmPriority | null {
  if (typeof value !== 'string') return null;
  return (PRIORITIES as readonly string[]).includes(value) ? (value as CrmPriority) : null;
}

function asTradeType(value: unknown): CrmTradeType | null {
  if (typeof value !== 'string') return null;
  return (CRM_TRADE_TYPES as readonly string[]).includes(value) ? (value as CrmTradeType) : null;
}

function asStageSlug(value: unknown): PipelineStageSlug | null {
  if (typeof value !== 'string') return null;
  return STAGE_SLUGS.has(value as PipelineStageSlug) ? (value as PipelineStageSlug) : null;
}

function asOptionalUserId(value: unknown): string | null {
  if (value == null || value === '') return null;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function validateCreateCrmProjectBody(body: CreateCrmProjectBody): ValidateCreateCrmProjectResult {
  const name = asNonEmptyString(body.name, 'name');
  if (!name) {
    return { ok: false, message: 'Project / customer name is required.' };
  }

  const contactName = asNonEmptyString(body.contactName, 'contactName');
  if (!contactName) {
    return { ok: false, message: 'Contact name is required.' };
  }

  const priority = asPriority(body.priority);
  if (!priority) {
    return { ok: false, message: 'Priority is invalid.' };
  }

  const tradeType = asTradeType(body.tradeType);
  if (!tradeType) {
    return { ok: false, message: 'Trade type is invalid.' };
  }

  const currentStageSlug = asStageSlug(body.currentStageSlug);
  if (!currentStageSlug) {
    return { ok: false, message: 'Current stage is invalid.' };
  }

  const dealValueCents = asCents(body.dealValueCents, 'dealValueCents');
  if (dealValueCents == null) {
    return { ok: false, message: 'Deal value must be a non-negative amount in cents.' };
  }

  const balanceRemainingCents = asCents(body.balanceRemainingCents, 'balanceRemainingCents');
  if (balanceRemainingCents == null) {
    return { ok: false, message: 'Balance must be a non-negative amount in cents.' };
  }

  let initialTemplateBlueprints: CreateCrmProjectInput['initialTemplateBlueprints'] = null;
  if (body.initialTemplateBlueprints != null) {
    if (typeof body.initialTemplateBlueprints !== 'object' || Array.isArray(body.initialTemplateBlueprints)) {
      return { ok: false, message: 'Template blueprints must be an object.' };
    }
    const parsed = parseProjectTemplateBlueprintsFromUnknown(
      body.initialTemplateBlueprints as Record<string, unknown>
    );
    if (parsed.workflowTasksPayload.length > 0 || parsed.paymentsPayload.length > 0) {
      initialTemplateBlueprints = parsed;
    }
  }

  return {
    ok: true,
    input: {
      name,
      tradeType,
      contactName,
      email: typeof body.email === 'string' ? body.email.trim() : '',
      phone: typeof body.phone === 'string' ? body.phone.trim() : '',
      priority,
      currentStageSlug,
      notes: asOptionalString(body.notes),
      dealValueCents,
      balanceRemainingCents,
      assignedMemberId: asOptionalUserId(body.assignedMemberId),
      initialTemplateBlueprints,
    },
  };
}
