import {
  projectHasPaymentMilestones,
  type CrmPriority,
  type CrmProjectDetail,
  type CrmTradeType,
  type PipelineStageSlug,
  type UpdateCrmProjectInput,
} from '@/domain/crm';
import type { CreateCrmProjectFormState } from '@/presentation/features/crmCreate/createCrmProjectFormModel';
import {
  parseUsdInputToCents,
  validateCreateCrmProjectForm,
} from '@/presentation/features/crmCreate/createCrmProjectFormModel';

export type SummaryEditableField =
  | 'name'
  | 'tradeType'
  | 'contactName'
  | 'email'
  | 'phone'
  | 'currentStageSlug'
  | 'priority'
  | 'dealValueUsd'
  | 'assignedMemberId'
  | 'notes';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidProjectEmail(email: string): boolean {
  const trimmed = email.trim();
  if (!trimmed) return true;
  return EMAIL_PATTERN.test(trimmed);
}

export function applySummaryFieldToForm(
  form: CreateCrmProjectFormState,
  field: SummaryEditableField,
  value: string
): CreateCrmProjectFormState {
  switch (field) {
    case 'name':
      return { ...form, name: value };
    case 'tradeType':
      return { ...form, tradeType: value as CrmTradeType };
    case 'contactName':
      return { ...form, contactName: value };
    case 'email':
      return { ...form, email: value };
    case 'phone':
      return { ...form, phone: value };
    case 'currentStageSlug':
      return { ...form, currentStageSlug: value as PipelineStageSlug };
    case 'priority':
      return { ...form, priority: value as CrmPriority };
    case 'dealValueUsd':
      return { ...form, dealValueUsd: value };
    case 'assignedMemberId':
      return { ...form, assignedMemberId: value };
    case 'notes':
      return { ...form, notes: value };
    default: {
      const _exhaustive: never = field;
      return _exhaustive;
    }
  }
}

export function isSummaryFieldUnchanged(
  project: CrmProjectDetail,
  field: SummaryEditableField,
  value: string
): boolean {
  const { summary } = project;
  switch (field) {
    case 'name':
      return value.trim() === summary.name;
    case 'tradeType':
      return value === summary.tradeType;
    case 'contactName':
      return value.trim() === summary.contact.name;
    case 'email':
      return value.trim() === summary.contact.email;
    case 'phone':
      return value.trim() === summary.contact.phone;
    case 'currentStageSlug':
      return value === summary.currentStageSlug;
    case 'priority':
      return value === summary.priority;
    case 'dealValueUsd': {
      const cents = parseUsdInputToCents(value);
      return cents != null && cents === summary.dealValueCents;
    }
    case 'assignedMemberId':
      return value === (summary.assignedTo?.id ?? '');
    case 'notes':
      return value.trim() === (project.notes ?? '').trim();
    default: {
      const _exhaustive: never = field;
      return _exhaustive;
    }
  }
}

export function projectDetailToFormState(project: CrmProjectDetail): CreateCrmProjectFormState {
  const { summary, notes } = project;
  return {
    name: summary.name,
    tradeType: summary.tradeType,
    contactName: summary.contact.name,
    email: summary.contact.email,
    phone: summary.contact.phone,
    priority: summary.priority,
    currentStageSlug: summary.currentStageSlug,
    waitingOn: summary.waitingOn ?? '',
    notes: notes ?? '',
    dealValueUsd: (summary.dealValueCents / 100).toFixed(2),
    balanceUsd: (summary.balanceRemainingCents / 100).toFixed(2),
    assignedMemberId: summary.assignedTo?.id ?? '',
  };
}

export function validateProjectDetailForm(
  form: CreateCrmProjectFormState,
  project: CrmProjectDetail
): { ok: true; input: UpdateCrmProjectInput } | { ok: false; message: string } {
  const validated = validateCreateCrmProjectForm(form);
  if (!validated.ok) return validated;

  const email = form.email.trim();
  if (!isValidProjectEmail(email)) {
    return { ok: false, message: 'Enter a valid email address.' };
  }

  if (projectHasPaymentMilestones(project)) {
    return {
      ok: true,
      input: {
        ...validated.input,
        balanceRemainingCents: project.summary.balanceRemainingCents,
      },
    };
  }

  return { ok: true, input: validated.input };
}

export { parseUsdInputToCents };
