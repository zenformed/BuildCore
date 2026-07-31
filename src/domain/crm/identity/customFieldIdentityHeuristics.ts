/**
 * Isolated custom-field identity heuristics.
 * Later, typed custom-field metadata can replace these without changing the
 * identity table, lookup, scoring, or integration surfaces.
 */

export type CustomFieldIdentityRole =
  | 'person_full_name'
  | 'person_first_name'
  | 'person_last_name'
  | 'email'
  | 'phone'
  | 'address'
  | 'identity_text'
  | 'exclude';

function normalizeKeyOrLabel(value: string): string {
  return value
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

const FULL_NAME_KEYS = new Set([
  'bride',
  'groom',
  'spouse',
  'wife',
  'husband',
  'partner',
  'customer',
  'client',
  'client_name',
  'customer_name',
  'contact',
  'contact_name',
  'full_name',
  'fullname',
  'lead_name',
  'person',
  'person_name',
]);

const FIRST_NAME_KEYS = new Set([
  'first_name',
  'firstname',
  'first',
  'fname',
  'given_name',
  'bride_first_name',
  'groom_first_name',
]);

const LAST_NAME_KEYS = new Set([
  'last_name',
  'lastname',
  'last',
  'lname',
  'surname',
  'family_name',
  'bride_last_name',
  'groom_last_name',
]);

const EMAIL_KEYS = new Set([
  'email',
  'e_mail',
  'email_address',
  'emails',
  'primary_email',
  'work_email',
  'home_email',
]);

const PHONE_KEYS = new Set([
  'phone',
  'phones',
  'mobile',
  'mobile_phone',
  'cell',
  'cell_phone',
  'telephone',
  'home_phone',
  'work_phone',
  'primary_phone',
  'phone_number',
]);

const ADDRESS_KEYS = new Set([
  'address',
  'street',
  'street_address',
  'address_line_1',
  'address1',
  'mailing_address',
  'home_address',
  'property_address',
  'site_address',
]);

const EXCLUDE_KEYS = new Set([
  'notes',
  'note',
  'comments',
  'comment',
  'description',
  'details',
  'memo',
  'status',
  'stage',
  'priority',
  'industry',
  'type',
  'category',
  'source',
  'lead_source',
  'active',
  'inactive',
  'boolean',
  'yes_no',
]);

/**
 * Classify a custom field by key/label heuristics for identity extraction.
 * Prefer future typed metadata over expanding this list in call sites.
 */
export function classifyCustomFieldIdentityRole(input: {
  readonly fieldKey: string;
  readonly label: string;
}): CustomFieldIdentityRole {
  const key = normalizeKeyOrLabel(input.fieldKey);
  const label = normalizeKeyOrLabel(input.label);
  const candidates = [key, label].filter((value) => value.length > 0);

  for (const candidate of candidates) {
    if (EXCLUDE_KEYS.has(candidate) || candidate.endsWith('_notes') || candidate.endsWith('_note')) {
      return 'exclude';
    }
  }

  for (const candidate of candidates) {
    if (FIRST_NAME_KEYS.has(candidate) || candidate.includes('first_name')) {
      return 'person_first_name';
    }
    if (LAST_NAME_KEYS.has(candidate) || candidate.includes('last_name')) {
      return 'person_last_name';
    }
    if (FULL_NAME_KEYS.has(candidate)) {
      return 'person_full_name';
    }
    if (EMAIL_KEYS.has(candidate) || candidate.includes('email')) {
      return 'email';
    }
    if (PHONE_KEYS.has(candidate) || candidate.includes('phone') || candidate.includes('mobile')) {
      return 'phone';
    }
    if (ADDRESS_KEYS.has(candidate) || candidate.includes('address')) {
      return 'address';
    }
  }

  // Label phrases not fully slug-collapsed above
  const labelLower = input.label.trim().toLowerCase();
  if (/\b(first\s+name|given\s+name)\b/.test(labelLower)) return 'person_first_name';
  if (/\b(last\s+name|family\s+name|surname)\b/.test(labelLower)) return 'person_last_name';
  if (/\b(bride|groom|spouse|full\s+name|customer\s+name)\b/.test(labelLower)) {
    return 'person_full_name';
  }

  return 'identity_text';
}
