import { US_STATE_CODES } from '@/domain/crm/usStates';
import {
  MAX_CONTACT_EMAILS,
  MAX_CONTACT_PHONES,
  validateContactEmailValues,
  validateContactPhoneValues,
} from '@/domain/crm/contactMultiValue';
import {
  validateRequiredCity,
  validateRequiredPostalCode,
} from '@/domain/crm/projectFormFieldValidation';
import type { LeadCaptureSubmitInput } from '@/domain/lead/leadCapture';
import { buildLeadCaptureFullName } from '@/infrastructure/lead/leadCaptureContactMerge';

const MAX_NAME = 120;
const MAX_ADDRESS = 200;

export type LeadCaptureBody = {
  firstName?: unknown;
  lastName?: unknown;
  email?: unknown;
  phone?: unknown;
  emails?: unknown;
  phones?: unknown;
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

function asRequiredString(value: unknown, maxLength: number): string | null {
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

export function validateLeadCaptureFormFields(body: LeadCaptureBody): ValidateLeadCaptureFormFieldsResult {
  const errors: LeadCaptureFormFieldErrors = {};

  const firstName = asRequiredString(body.firstName, MAX_NAME);
  if (!firstName) {
    errors.firstName = 'First name is required.';
  }

  const lastName = asRequiredString(body.lastName, MAX_NAME);
  if (!lastName) {
    errors.lastName = 'Last name is required.';
  }

  if (firstName && lastName) {
    const fullName = buildLeadCaptureFullName(firstName, lastName);
    if (fullName.length > MAX_NAME) {
      errors.firstName = 'Name is too long.';
    }
  }

  const rawEmails = asContactValueArray(body.emails, body.email, MAX_CONTACT_EMAILS);
  if (rawEmails == null) {
    errors.email = 'Email addresses are invalid.';
  } else if (rawEmails.length === 0) {
    errors.email = 'Email is required.';
  } else {
    const emailValidated = validateContactEmailValues(rawEmails);
    if (!emailValidated.ok) {
      errors.email = emailValidated.message;
    }
  }

  const rawPhones = asContactValueArray(body.phones, body.phone, MAX_CONTACT_PHONES);
  if (rawPhones == null) {
    errors.phone = 'Phone numbers are invalid.';
  } else if (rawPhones.length === 0) {
    errors.phone = 'Phone is required.';
  } else {
    const phoneValidated = validateContactPhoneValues(rawPhones);
    if (!phoneValidated.ok) {
      errors.phone = phoneValidated.message;
    }
  }

  const addressLine1 = asRequiredString(body.addressLine1, MAX_ADDRESS);
  if (!addressLine1) {
    errors.addressLine1 = 'Address is required.';
  }

  asOptionalString(body.addressLine2, MAX_ADDRESS);

  const cityValidated = validateRequiredCity(typeof body.city === 'string' ? body.city : '');
  if (!cityValidated.ok) {
    errors.city = cityValidated.message;
  }

  const state = asRequiredString(body.state, 2);
  if (!state) {
    errors.state = 'State is required.';
  } else {
    const stateUpper = state.toUpperCase();
    if (!US_STATE_CODES.has(stateUpper)) {
      errors.state = 'Select a valid US state.';
    }
  }

  const postalValidated = validateRequiredPostalCode(
    typeof body.postalCode === 'string' ? body.postalCode : ''
  );
  if (!postalValidated.ok) {
    errors.postalCode = postalValidated.message;
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  const emailValidated = validateContactEmailValues(rawEmails!);
  if (!emailValidated.ok) {
    return { ok: false, errors: { email: emailValidated.message } };
  }

  const phoneValidated = validateContactPhoneValues(rawPhones!);
  if (!phoneValidated.ok) {
    return { ok: false, errors: { phone: phoneValidated.message } };
  }

  if (!cityValidated.ok) {
    return { ok: false, errors: { city: cityValidated.message } };
  }

  if (!postalValidated.ok) {
    return { ok: false, errors: { postalCode: postalValidated.message } };
  }

  return {
    ok: true,
    input: {
      firstName: firstName!,
      lastName: lastName!,
      emails: emailValidated.emails,
      phones: phoneValidated.phones,
      addressLine1: addressLine1!,
      addressLine2: asOptionalString(body.addressLine2, MAX_ADDRESS),
      city: cityValidated.city,
      state: state!.toUpperCase(),
      postalCode: postalValidated.postalCode,
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
