import type { CreateCrmProjectInput, CrmPriority, CrmIndustry, PipelineStageSlug, CrmProjectDetail } from '@/domain/crm';
import { validateCrmIndustryFields } from '@/domain/crm';
import { getFirstPipelineStageSlug } from '@/domain/crm/pipelineStage';
import { titleCasePersonOrEntityName } from '@/domain/crm/titleCaseName';
import { US_STATE_CODES } from '@/domain/crm/usStates';
import {
  validateContactEmailValues,
  validateContactPhoneValues,
} from '@/domain/crm/contactMultiValue';
import {
  validateOptionalCity,
  validateOptionalPostalCode,
  validateProjectNotes,
} from '@/domain/crm/projectFormFieldValidation';
import {
  isValidCrmProjectLatitude,
  isValidCrmProjectLongitude,
  validateCrmProjectCoordinates,
} from '@/domain/crm/projectCoordinates';
import { normalizeAssigneeMemberIdForSave } from '@/presentation/features/crmAssignment/buildAssigneeOptions';
import { getBuildCoreDashboardContent } from '@/platform/content/buildCoreDashboardContent';

export type CrmProjectAddressEntryMode = 'street' | 'coordinates';

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
  addressEntryMode: CrmProjectAddressEntryMode;
  latitude: string;
  longitude: string;
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
  addressEntryMode: 'street',
  latitude: '',
  longitude: '',
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
    industry: summary.industry,
    customIndustry: summary.customIndustry ?? '',
    contactName: summary.contact.name,
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

export type CrmProjectCoordinateFormErrors = {
  readonly latitude?: string;
  readonly longitude?: string;
};

export type CrmProjectStreetAddressFormField =
  | 'addressLine1'
  | 'addressLine2'
  | 'city'
  | 'state'
  | 'postalCode';

export function applyManualStreetAddressEdit(
  form: CreateCrmProjectFormState,
  field: CrmProjectStreetAddressFormField,
  value: string
): CreateCrmProjectFormState {
  return {
    ...form,
    [field]: value,
    latitude: '',
    longitude: '',
  };
}

export function applyVerifiedGoogleAddress(
  form: CreateCrmProjectFormState,
  address: {
    readonly addressLine1: string;
    readonly city: string;
    readonly state: string;
    readonly postalCode: string;
    readonly latitude: number;
    readonly longitude: number;
  }
): CreateCrmProjectFormState {
  return {
    ...form,
    addressEntryMode: 'street',
    addressLine1: address.addressLine1,
    city: address.city,
    state: address.state,
    postalCode: address.postalCode,
    latitude: String(address.latitude),
    longitude: String(address.longitude),
  };
}

function parseCoordinateFormValue(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

export function validateCrmProjectCoordinateFormFields(
  form: Pick<CreateCrmProjectFormState, 'addressEntryMode' | 'latitude' | 'longitude'>
): CrmProjectCoordinateFormErrors {
  const latitude = parseCoordinateFormValue(form.latitude);
  const longitude = parseCoordinateFormValue(form.longitude);
  if (form.addressEntryMode === 'street' && latitude == null && longitude == null) {
    return {};
  }
  const errors: { latitude?: string; longitude?: string } = {};
  if (latitude == null) {
    errors.latitude = 'Latitude is required.';
  } else if (!isValidCrmProjectLatitude(latitude)) {
    errors.latitude = 'Latitude must be between -90 and 90.';
  }
  if (longitude == null) {
    errors.longitude = 'Longitude is required.';
  } else if (!isValidCrmProjectLongitude(longitude)) {
    errors.longitude = 'Longitude must be between -180 and 180.';
  }
  return errors;
}

export function validateCreateCrmProjectForm(
  form: CreateCrmProjectFormState
): { ok: true; input: CreateCrmProjectInput } | { ok: false; message: string } {
  const name = titleCasePersonOrEntityName(form.name);
  if (!name) {
    return {
      ok: false,
      message: `${getBuildCoreDashboardContent().crm.create.fields.name} is required.`,
    };
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

  const latitude = parseCoordinateFormValue(form.latitude);
  const longitude = parseCoordinateFormValue(form.longitude);
  const coordinatesValidated =
    form.addressEntryMode === 'street' && latitude == null && longitude == null
      ? { ok: true as const, coordinates: null }
      : validateCrmProjectCoordinates(latitude, longitude);
  if (!coordinatesValidated.ok) {
    return { ok: false, message: coordinatesValidated.message };
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
      latitude: coordinatesValidated.coordinates?.latitude ?? null,
      longitude: coordinatesValidated.coordinates?.longitude ?? null,
    },
  };
}
