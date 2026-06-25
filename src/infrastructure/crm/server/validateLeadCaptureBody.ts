import { US_STATE_CODES } from '@/domain/crm/usStates';
import type { LeadCaptureSubmitInput } from '@/domain/lead/leadCapture';
import { buildLeadCaptureFullName } from '@/infrastructure/lead/leadCaptureContactMerge';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_NAME = 120;
const MAX_EMAIL = 254;
const MAX_PHONE = 40;
const MAX_ADDRESS = 200;
const MAX_CITY = 120;
const MAX_POSTAL = 20;

export type LeadCaptureBody = {
  firstName?: unknown;
  lastName?: unknown;
  email?: unknown;
  phone?: unknown;
  addressLine1?: unknown;
  addressLine2?: unknown;
  city?: unknown;
  state?: unknown;
  postalCode?: unknown;
};

export type ValidateLeadCaptureBodyResult =
  | { readonly ok: true; readonly input: LeadCaptureSubmitInput }
  | { readonly ok: false; readonly message: string };

export type LeadCaptureFormFieldKey =
  | 'firstName'
  | 'lastName'
  | 'email'
  | 'phone'
  | 'addressLine1'
  | 'city'
  | 'state'
  | 'postalCode';

export type LeadCaptureFormFieldErrors = Partial<Record<LeadCaptureFormFieldKey, string>>;

export type ValidateLeadCaptureFormFieldsResult =
  | { readonly ok: true; readonly input: LeadCaptureSubmitInput }
  | { readonly ok: false; readonly errors: LeadCaptureFormFieldErrors; readonly formError?: string };

function asRequiredString(value: unknown, fieldLabel: string, maxLength: number): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > maxLength) return null;
  return trimmed;
}

function asOptionalString(value: unknown, maxLength: number): string | null {
  if (value == null) return null;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > maxLength) return null;
  return trimmed;
}

export function validateLeadCaptureFormFields(body: LeadCaptureBody): ValidateLeadCaptureFormFieldsResult {
  const errors: LeadCaptureFormFieldErrors = {};

  const firstName = asRequiredString(body.firstName, 'First name', MAX_NAME);
  if (!firstName) {
    errors.firstName = 'First name is required.';
  }

  const lastName = asRequiredString(body.lastName, 'Last name', MAX_NAME);
  if (!lastName) {
    errors.lastName = 'Last name is required.';
  }

  if (firstName && lastName) {
    const fullName = buildLeadCaptureFullName(firstName, lastName);
    if (fullName.length > MAX_NAME) {
      errors.firstName = 'Name is too long.';
    }
  }

  const emailRaw = asRequiredString(body.email, 'Email', MAX_EMAIL);
  if (!emailRaw) {
    errors.email = 'Email is required.';
  } else {
    const email = emailRaw.toLowerCase();
    if (!EMAIL_PATTERN.test(email)) {
      errors.email = 'Email is invalid.';
    }
  }

  const phone = asRequiredString(body.phone, 'Phone', MAX_PHONE);
  if (!phone) {
    errors.phone = 'Phone is required.';
  }

  const addressLine1 = asRequiredString(body.addressLine1, 'Address', MAX_ADDRESS);
  if (!addressLine1) {
    errors.addressLine1 = 'Address is required.';
  }

  asOptionalString(body.addressLine2, MAX_ADDRESS);

  const city = asRequiredString(body.city, 'City', MAX_CITY);
  if (!city) {
    errors.city = 'City is required.';
  }

  const state = asRequiredString(body.state, 'State', 2);
  if (!state) {
    errors.state = 'State is required.';
  } else {
    const stateUpper = state.toUpperCase();
    if (!US_STATE_CODES.has(stateUpper)) {
      errors.state = 'State must be a valid US state code.';
    }
  }

  const postalCode = asRequiredString(body.postalCode, 'ZIP', MAX_POSTAL);
  if (!postalCode) {
    errors.postalCode = 'ZIP is required.';
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  const email = emailRaw!.toLowerCase();
  const stateUpper = state!.toUpperCase();

  return {
    ok: true,
    input: {
      firstName: firstName!,
      lastName: lastName!,
      email,
      phone: phone!,
      addressLine1: addressLine1!,
      addressLine2: asOptionalString(body.addressLine2, MAX_ADDRESS),
      city: city!,
      state: stateUpper,
      postalCode: postalCode!,
    },
  };
}

export function validateLeadCaptureBody(body: LeadCaptureBody): ValidateLeadCaptureBodyResult {
  const result = validateLeadCaptureFormFields(body);
  if (result.ok) {
    return result;
  }

  const firstFieldError = Object.values(result.errors)[0];
  return {
    ok: false,
    message: result.formError ?? firstFieldError ?? 'Please complete all required fields.',
  };
}
