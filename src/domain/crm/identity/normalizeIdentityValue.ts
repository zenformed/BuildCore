import { extractUsPhoneDigits, US_PHONE_DIGIT_COUNT } from '@/domain/crm/phoneFormat';
import { formatCrmProjectAddressLine } from '@/domain/crm/projectAddress';
import { normalizeUsPostalCode } from '@/domain/geo/normalizeUsPostalCode';
import {
  CRM_IDENTITY_TEXT_MAX_LENGTH,
  type CrmIdentityAddressParts,
  type CrmIdentityValueType,
} from './identityTypes';

const EMAIL_PATTERN = /^[^\s@]+@[a-z0-9.-]+\.[a-z]{2,}$/i;

/** Low-signal scalars that must not enter the identity index. */
const IDENTITY_STOP_VALUES = new Set([
  'yes',
  'no',
  'y',
  'n',
  'true',
  'false',
  'active',
  'inactive',
  'archived',
  'residential',
  'commercial',
  'none',
  'null',
  'n/a',
  'na',
  'unknown',
  'tbd',
  'test',
  'asdf',
]);

/**
 * Common given names that are weak alone. Multi-token names are never blocked by this list.
 * Kept intentionally small and replaceable; not a full census.
 */
const WEAK_SINGLE_TOKEN_GIVEN_NAMES = new Set([
  'brenda',
  'mark',
  'john',
  'jane',
  'michael',
  'sarah',
  'david',
  'mary',
  'james',
  'jennifer',
  'robert',
  'linda',
  'william',
  'elizabeth',
  'richard',
  'susan',
  'joseph',
  'jessica',
  'thomas',
  'karen',
  'chris',
  'alex',
  'sam',
  'pat',
  'taylor',
  'jordan',
  'mike',
  'bob',
  'bill',
  'ann',
  'anne',
  'amy',
  'emma',
  'olivia',
  'noah',
  'liam',
]);

/** Collapse whitespace and strip harmless punctuation for person/place text. */
export function normalizeIdentityText(raw: string): string | null {
  const collapsed = raw
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/[.,/#!$%^&*;:{}=_`~()"[\]]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return collapsed.length > 0 ? collapsed : null;
}

export function isIdentityStopValue(normalized: string): boolean {
  return IDENTITY_STOP_VALUES.has(normalized);
}

export function normalizeIdentityEmail(raw: string): string | null {
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed || !EMAIL_PATTERN.test(trimmed)) return null;
  return trimmed;
}

/** Digits-only US phone; requires a complete 10-digit number. */
export function normalizeIdentityPhone(raw: string): string | null {
  const digits = extractUsPhoneDigits(raw);
  if (digits.length !== US_PHONE_DIGIT_COUNT) return null;
  return digits;
}

/**
 * Full-name normalization. Returns null for empty / stop values.
 * Single-token common given names are excluded (weak alone).
 */
export function normalizeIdentityName(
  raw: string,
  options?: { readonly allowWeakSingleToken?: boolean }
): string | null {
  const normalized = normalizeIdentityText(raw);
  if (normalized == null || isIdentityStopValue(normalized)) return null;
  if (normalized.length > CRM_IDENTITY_TEXT_MAX_LENGTH) return null;

  const tokens = normalized.split(' ').filter(Boolean);
  if (tokens.length === 0) return null;
  if (
    tokens.length === 1 &&
    !options?.allowWeakSingleToken &&
    WEAK_SINGLE_TOKEN_GIVEN_NAMES.has(tokens[0]!)
  ) {
    return null;
  }
  return normalized;
}

export function composeIdentityAddressRaw(address: CrmIdentityAddressParts): string | null {
  const postal =
    address.postalCode != null && address.postalCode.trim() !== ''
      ? (normalizeUsPostalCode(address.postalCode) ?? address.postalCode.trim())
      : null;

  return formatCrmProjectAddressLine({
    addressLine1: address.addressLine1,
    addressLine2: address.addressLine2,
    city: address.city,
    state: address.state,
    postalCode: postal,
  });
}

export function normalizeIdentityAddress(address: CrmIdentityAddressParts): string | null {
  const composed = composeIdentityAddressRaw(address);
  if (composed == null) return null;
  const normalized = normalizeIdentityText(composed);
  if (normalized == null || isIdentityStopValue(normalized)) return null;
  return normalized;
}

export function normalizeIdentityTextValue(raw: string): string | null {
  const normalized = normalizeIdentityText(raw);
  if (normalized == null || isIdentityStopValue(normalized)) return null;
  if (normalized.length > CRM_IDENTITY_TEXT_MAX_LENGTH) return null;
  return normalized;
}

export function normalizeIdentityValue(
  valueType: CrmIdentityValueType,
  raw: string
): string | null {
  switch (valueType) {
    case 'email':
      return normalizeIdentityEmail(raw);
    case 'phone':
      return normalizeIdentityPhone(raw);
    case 'name':
      return normalizeIdentityName(raw);
    case 'address':
      return normalizeIdentityText(raw);
    case 'identity_text':
      return normalizeIdentityTextValue(raw);
    default: {
      const _exhaustive: never = valueType;
      return _exhaustive;
    }
  }
}
