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

export function validateLeadCaptureBody(body: LeadCaptureBody): ValidateLeadCaptureBodyResult {
  const firstName = asRequiredString(body.firstName, 'First name', MAX_NAME);
  if (!firstName) {
    return { ok: false, message: 'First name is required.' };
  }

  const lastName = asRequiredString(body.lastName, 'Last name', MAX_NAME);
  if (!lastName) {
    return { ok: false, message: 'Last name is required.' };
  }

  const fullName = buildLeadCaptureFullName(firstName, lastName);
  if (fullName.length > MAX_NAME) {
    return { ok: false, message: 'Name is too long.' };
  }

  const emailRaw = asRequiredString(body.email, 'Email', MAX_EMAIL);
  if (!emailRaw) {
    return { ok: false, message: 'Email is required.' };
  }
  const email = emailRaw.toLowerCase();
  if (!EMAIL_PATTERN.test(email)) {
    return { ok: false, message: 'Email is invalid.' };
  }

  const phone = asRequiredString(body.phone, 'Phone', MAX_PHONE);
  if (!phone) {
    return { ok: false, message: 'Phone is required.' };
  }

  const addressLine1 = asRequiredString(body.addressLine1, 'Address', MAX_ADDRESS);
  if (!addressLine1) {
    return { ok: false, message: 'Address is required.' };
  }

  const addressLine2 = asOptionalString(body.addressLine2, MAX_ADDRESS);

  const city = asRequiredString(body.city, 'City', MAX_CITY);
  if (!city) {
    return { ok: false, message: 'City is required.' };
  }

  const state = asRequiredString(body.state, 'State', 2);
  if (!state) {
    return { ok: false, message: 'State is required.' };
  }
  const stateUpper = state.toUpperCase();
  if (!US_STATE_CODES.has(stateUpper)) {
    return { ok: false, message: 'State must be a valid US state code.' };
  }

  const postalCode = asRequiredString(body.postalCode, 'ZIP', MAX_POSTAL);
  if (!postalCode) {
    return { ok: false, message: 'ZIP is required.' };
  }

  return {
    ok: true,
    input: {
      firstName,
      lastName,
      email,
      phone,
      addressLine1,
      addressLine2,
      city,
      state: stateUpper,
      postalCode,
    },
  };
}
