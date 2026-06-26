import type { CreateCrmProjectInput } from '@/domain/crm/createProject';
import type { CrmPriority, CrmIndustry } from '@/domain/crm';
import {
  pipelineStageSlugSet,
  type PipelineStageSlug,
  validateCrmIndustryFields,
  isCrmIndustry,
} from '@/domain/crm';
import { US_STATE_CODES } from '@/domain/crm/usStates';
import { parseProjectTemplateBlueprintsFromUnknown } from '@/infrastructure/crm/mappers/mapProjectTemplateFromDb';
import {
  MAX_CONTACT_EMAILS,
  MAX_CONTACT_PHONES,
  validateContactEmailValues,
  validateContactPhoneValues,
} from '@/domain/crm/contactMultiValue';

const PRIORITIES: readonly CrmPriority[] = ['low', 'normal', 'high', 'urgent'];

export type CreateCrmProjectBody = {
  name?: unknown;
  contactName?: unknown;
  email?: unknown;
  phone?: unknown;
  emails?: unknown;
  phones?: unknown;
  priority?: unknown;
  industry?: unknown;
  customIndustry?: unknown;
  currentStageSlug?: unknown;
  notes?: unknown;
  dealValueCents?: unknown;
  balanceRemainingCents?: unknown;
  assignedMemberId?: unknown;
  addressLine1?: unknown;
  addressLine2?: unknown;
  city?: unknown;
  state?: unknown;
  postalCode?: unknown;
  initialTemplateBlueprints?: unknown;
  parentProjectId?: unknown;
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

function asIndustry(value: unknown): CrmIndustry | null {
  if (typeof value !== 'string') return null;
  return isCrmIndustry(value) ? value : null;
}

function asStageSlug(
  value: unknown,
  allowedStageSlugs: ReadonlySet<string>
): PipelineStageSlug | null {
  if (typeof value !== 'string') return null;
  return allowedStageSlugs.has(value) ? value : null;
}

function asOptionalUserId(value: unknown): string | null {
  if (value == null || value === '') return null;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asOptionalParentProjectId(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value == null || value === '') return null;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asContactValueArray(
  values: unknown,
  legacySingle: unknown,
  maxCount: number
): readonly string[] | null {
  if (values !== undefined) {
    if (!Array.isArray(values)) return null;
    if (values.length > maxCount) return null;
    const normalized: string[] = [];
    for (const item of values) {
      if (typeof item !== 'string') return null;
      const trimmed = item.trim();
      if (trimmed) normalized.push(trimmed);
    }
    return normalized;
  }

  if (typeof legacySingle === 'string') {
    const trimmed = legacySingle.trim();
    return trimmed ? [trimmed] : [];
  }

  if (legacySingle == null || legacySingle === '') {
    return [];
  }

  return null;
}

export function validateCreateCrmProjectBody(
  body: CreateCrmProjectBody,
  options?: { allowedStageSlugs?: ReadonlySet<string> }
): ValidateCreateCrmProjectResult {
  const allowedStageSlugs = options?.allowedStageSlugs ?? pipelineStageSlugSet();
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

  const industryValidated = validateCrmIndustryFields(
    asIndustry(body.industry),
    asOptionalString(body.customIndustry)
  );
  if (!industryValidated.ok) {
    return industryValidated;
  }

  const currentStageSlug = asStageSlug(body.currentStageSlug, allowedStageSlugs);
  if (!currentStageSlug) {
    return { ok: false, message: 'Current stage is invalid.' };
  }

  const dealValueCents =
    body.dealValueCents === undefined || body.dealValueCents === null
      ? 0
      : asCents(body.dealValueCents, 'dealValueCents');
  if (dealValueCents == null) {
    return { ok: false, message: 'Deal value must be a non-negative amount in cents.' };
  }

  const balanceRemainingCents =
    body.balanceRemainingCents === undefined || body.balanceRemainingCents === null
      ? 0
      : asCents(body.balanceRemainingCents, 'balanceRemainingCents');
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

  const state = asOptionalString(body.state);
  if (state != null && !US_STATE_CODES.has(state)) {
    return { ok: false, message: 'State must be a valid US state code.' };
  }

  const parentProjectId = asOptionalParentProjectId(body.parentProjectId);
  if (parentProjectId === null && body.parentProjectId != null && body.parentProjectId !== '') {
    return { ok: false, message: 'Parent project id is invalid.' };
  }

  const rawEmails = asContactValueArray(body.emails, body.email, MAX_CONTACT_EMAILS);
  if (rawEmails == null) {
    return { ok: false, message: 'Email addresses are invalid.' };
  }
  const emailValidated = validateContactEmailValues(rawEmails);
  if (!emailValidated.ok) {
    return emailValidated;
  }

  const rawPhones = asContactValueArray(body.phones, body.phone, MAX_CONTACT_PHONES);
  if (rawPhones == null) {
    return { ok: false, message: 'Phone numbers are invalid.' };
  }
  const phoneValidated = validateContactPhoneValues(rawPhones);
  if (!phoneValidated.ok) {
    return phoneValidated;
  }

  return {
    ok: true,
    input: {
      name,
      industry: industryValidated.industry,
      customIndustry: industryValidated.customIndustry,
      contactName,
      emails: emailValidated.emails,
      phones: phoneValidated.phones,
      priority,
      currentStageSlug,
      notes: asOptionalString(body.notes),
      dealValueCents,
      balanceRemainingCents,
      assignedMemberId: asOptionalUserId(body.assignedMemberId),
      addressLine1: asOptionalString(body.addressLine1),
      addressLine2: asOptionalString(body.addressLine2),
      city: asOptionalString(body.city),
      state,
      postalCode: asOptionalString(body.postalCode),
      initialTemplateBlueprints,
      ...(parentProjectId !== undefined ? { parentProjectId } : {}),
    },
  };
}
