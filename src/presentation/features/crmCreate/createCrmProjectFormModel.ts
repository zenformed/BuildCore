import type { CreateCrmProjectInput, CrmPriority, CrmIndustry, PipelineStageSlug, CrmProjectDetail } from '@/domain/crm';
import { validateCrmIndustryFields } from '@/domain/crm';
import { getFirstPipelineStageSlug } from '@/domain/crm/pipelineStage';
import { titleCasePersonOrEntityName } from '@/domain/crm/titleCaseName';
import { US_STATE_CODES } from '@/domain/crm/usStates';
import {
  contactValuesToFormFields,
  contactPhonesToFormFields,
  validateContactEmailValues,
  validateContactPhoneValues,
} from '@/domain/crm/contactMultiValue';
import {
  validateOptionalCity,
  validateOptionalPostalCode,
  validateProjectNotes,
} from '@/domain/crm/projectFormFieldValidation';
import { normalizeAssigneeMemberIdForSave } from '@/presentation/features/crmAssignment/buildAssigneeOptions';

export type CreateCrmProjectFormState = {
  name: string;
  industry: CrmIndustry;
  customIndustry: string;
  contactName: string;
  emails: string[];
  phones: string[];
  priority: CrmPriority;
  currentStageSlug: PipelineStageSlug;
  notes: string;
  dealValueUsd: string;
  balanceUsd: string;
  assignedMemberId: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
};

export const defaultCreateCrmProjectFormState = (): CreateCrmProjectFormState => ({
  name: '',
  industry: 'hvac',
  customIndustry: '',
  contactName: '',
  emails: [''],
  phones: [''],
  priority: 'normal',
  currentStageSlug: getFirstPipelineStageSlug(),
  notes: '',
  dealValueUsd: '',
  balanceUsd: '',
  assignedMemberId: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  postalCode: '',
});

/** Initial create form values copied from a parent project (subproject defaults only). */
export function createSubprojectFormDefaultsFromParent(
  parent: CrmProjectDetail
): CreateCrmProjectFormState {
  const base = defaultCreateCrmProjectFormState();
  const { summary } = parent;
  return {
    ...base,
    name: summary.name,
    contactName: summary.contact.name,
    emails: contactValuesToFormFields(summary.contact.emails),
    phones: contactPhonesToFormFields(summary.contact.phones),
    addressLine1: summary.address.addressLine1 ?? '',
    addressLine2: summary.address.addressLine2 ?? '',
    city: summary.address.city ?? '',
    state: summary.address.state ?? '',
    postalCode: summary.address.postalCode ?? '',
  };
}

export function parseUsdInputToCents(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return 0;
  const normalized = trimmed.replace(/[^0-9.]/g, '');
  if (!normalized) return null;
  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount < 0) return null;
  return Math.round(amount * 100);
}

export function validateCreateCrmProjectForm(
  form: CreateCrmProjectFormState
): { ok: true; input: CreateCrmProjectInput } | { ok: false; message: string } {
  const name = titleCasePersonOrEntityName(form.name);
  if (!name) {
    return { ok: false, message: 'Project / customer name is required.' };
  }

  const contactName = titleCasePersonOrEntityName(form.contactName);
  if (!contactName) {
    return { ok: false, message: 'Contact name is required.' };
  }

  const industryValidated = validateCrmIndustryFields(form.industry, form.customIndustry);
  if (!industryValidated.ok) {
    return industryValidated;
  }

  const dealValueCents = 0;

  const state = form.state.trim();
  if (state && !US_STATE_CODES.has(state)) {
    return { ok: false, message: 'Select a valid US state.' };
  }

  const emailValidated = validateContactEmailValues(form.emails);
  if (!emailValidated.ok) {
    return emailValidated;
  }

  const phoneValidated = validateContactPhoneValues(form.phones);
  if (!phoneValidated.ok) {
    return phoneValidated;
  }

  const cityValidated = validateOptionalCity(form.city);
  if (!cityValidated.ok) {
    return cityValidated;
  }

  const postalValidated = validateOptionalPostalCode(form.postalCode);
  if (!postalValidated.ok) {
    return postalValidated;
  }

  const notesValidated = validateProjectNotes(form.notes);
  if (!notesValidated.ok) {
    return notesValidated;
  }

  const optionalText = (value: string): string | null => {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  };

  return {
    ok: true,
    input: {
      name,
      industry: industryValidated.industry,
      customIndustry: industryValidated.customIndustry,
      contactName,
      emails: emailValidated.emails,
      phones: phoneValidated.phones,
      priority: form.priority,
      currentStageSlug: form.currentStageSlug,
      notes: notesValidated.notes,
      dealValueCents,
      balanceRemainingCents: 0,
      assignedMemberId: normalizeAssigneeMemberIdForSave(form.assignedMemberId),
      addressLine1: optionalText(form.addressLine1),
      addressLine2: optionalText(form.addressLine2),
      city: cityValidated.city,
      state: state || null,
      postalCode: postalValidated.postalCode,
    },
  };
}
