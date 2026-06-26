import {
  type CrmPriority,
  type CrmProjectDetail,
  type CrmIndustry,
  type PipelineStageSlug,
  type UpdateCrmProjectInput,
} from '@/domain/crm';
import {
  contactValuesToFormFields,
  isValidContactEmail,
  updatePrimaryContactFormValue,
} from '@/domain/crm/contactMultiValue';
import type { CreateCrmProjectFormState } from '@/presentation/features/crmCreate/createCrmProjectFormModel';
import {
  parseUsdInputToCents,
  validateCreateCrmProjectForm,
} from '@/presentation/features/crmCreate/createCrmProjectFormModel';

export type SummaryEditableField =
  | 'name'
  | 'industry'
  | 'customIndustry'
  | 'contactName'
  | 'email'
  | 'phone'
  | 'currentStageSlug'
  | 'priority'
  | 'assignedMemberId'
  | 'notes'
  | 'addressLine1'
  | 'addressLine2'
  | 'city'
  | 'state'
  | 'postalCode';

export function isValidProjectEmail(email: string): boolean {
  return isValidContactEmail(email);
}

export function applySummaryFieldToForm(
  form: CreateCrmProjectFormState,
  field: SummaryEditableField,
  value: string
): CreateCrmProjectFormState {
  switch (field) {
    case 'name':
      return { ...form, name: value };
    case 'industry':
      return {
        ...form,
        industry: value as CrmIndustry,
        customIndustry: value === 'other' ? form.customIndustry : '',
      };
    case 'customIndustry':
      return { ...form, customIndustry: value };
    case 'contactName':
      return { ...form, contactName: value };
    case 'email':
      return { ...form, emails: updatePrimaryContactFormValue(form.emails, value) };
    case 'phone':
      return { ...form, phones: updatePrimaryContactFormValue(form.phones, value) };
    case 'currentStageSlug':
      return { ...form, currentStageSlug: value as PipelineStageSlug };
    case 'priority':
      return { ...form, priority: value as CrmPriority };
    case 'assignedMemberId':
      return { ...form, assignedMemberId: value };
    case 'notes':
      return { ...form, notes: value };
    case 'addressLine1':
      return { ...form, addressLine1: value };
    case 'addressLine2':
      return { ...form, addressLine2: value };
    case 'city':
      return { ...form, city: value };
    case 'state':
      return { ...form, state: value };
    case 'postalCode':
      return { ...form, postalCode: value };
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
    case 'industry':
      return value === summary.industry;
    case 'customIndustry':
      return value.trim() === (summary.customIndustry ?? '').trim();
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
    case 'assignedMemberId':
      return value === (summary.assignedTo?.id ?? '');
    case 'notes':
      return value.trim() === (project.notes ?? '').trim();
    case 'addressLine1':
      return value.trim() === (summary.address.addressLine1 ?? '').trim();
    case 'addressLine2':
      return value.trim() === (summary.address.addressLine2 ?? '').trim();
    case 'city':
      return value.trim() === (summary.address.city ?? '').trim();
    case 'state':
      return value.trim() === (summary.address.state ?? '').trim();
    case 'postalCode':
      return value.trim() === (summary.address.postalCode ?? '').trim();
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
    industry: summary.industry,
    customIndustry: summary.customIndustry ?? '',
    contactName: summary.contact.name,
    emails: contactValuesToFormFields(summary.contact.emails),
    phones: contactValuesToFormFields(summary.contact.phones),
    priority: summary.priority,
    currentStageSlug: summary.currentStageSlug,
    notes: notes ?? '',
    dealValueUsd: '',
    balanceUsd: '',
    assignedMemberId: summary.assignedTo?.id ?? '',
    addressLine1: summary.address.addressLine1 ?? '',
    addressLine2: summary.address.addressLine2 ?? '',
    city: summary.address.city ?? '',
    state: summary.address.state ?? '',
    postalCode: summary.address.postalCode ?? '',
  };
}

export function validateProjectDetailForm(
  form: CreateCrmProjectFormState,
  project: CrmProjectDetail
): { ok: true; input: UpdateCrmProjectInput } | { ok: false; message: string } {
  const validated = validateCreateCrmProjectForm(form);
  if (!validated.ok) return validated;

  return {
    ok: true,
    input: {
      ...validated.input,
      dealValueCents: project.summary.dealValueCents,
      balanceRemainingCents: project.summary.balanceRemainingCents,
    },
  };
}

export { parseUsdInputToCents };
