import { formatUsPhoneDisplay, formatUsPhoneInput } from '@/domain/crm/phoneFormat';

export const MAX_CONTACT_EMAILS = 4;
export const MAX_CONTACT_PHONES = 4;
export const MAX_CONTACT_PHONE_LENGTH = 40;

const EMAIL_PATTERN = /^[^\s@]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

export function isValidContactEmail(email: string): boolean {
  const trimmed = email.trim();
  if (!trimmed) return true;
  return EMAIL_PATTERN.test(trimmed);
}

export function normalizeContactEmails(values: readonly string[]): readonly string[] {
  const normalized: string[] = [];
  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed) continue;
    if (normalized.includes(trimmed)) continue;
    normalized.push(trimmed);
    if (normalized.length >= MAX_CONTACT_EMAILS) break;
  }
  return normalized;
}

export function normalizeContactPhones(values: readonly string[]): readonly string[] {
  const normalized: string[] = [];
  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed) continue;
    const formatted = formatUsPhoneDisplay(trimmed);
    if (normalized.includes(formatted)) continue;
    normalized.push(formatted.slice(0, MAX_CONTACT_PHONE_LENGTH));
    if (normalized.length >= MAX_CONTACT_PHONES) break;
  }
  return normalized;
}

export function primaryContactEmail(emails: readonly string[]): string {
  return emails[0] ?? '';
}

export function primaryContactPhone(phones: readonly string[]): string {
  return phones[0] ?? '';
}

export function contactValuesToFormFields(values: readonly string[]): string[] {
  if (values.length === 0) return [''];
  return [...values];
}

export function contactPhonesToFormFields(values: readonly string[]): string[] {
  if (values.length === 0) return [''];
  return values.map((value) => (value.trim() ? formatUsPhoneInput(value) : ''));
}

export function updatePrimaryContactFormValue(values: readonly string[], nextPrimary: string): string[] {
  if (values.length === 0) return [nextPrimary];
  return [nextPrimary, ...values.slice(1)];
}

export function validateContactEmailValues(
  values: readonly string[]
): { ok: true; emails: readonly string[] } | { ok: false; message: string } {
  const nonEmpty = values.filter((value) => value.trim().length > 0);
  if (nonEmpty.length > MAX_CONTACT_EMAILS) {
    return { ok: false, message: `A project can have at most ${MAX_CONTACT_EMAILS} email addresses.` };
  }
  for (const email of nonEmpty) {
    if (!isValidContactEmail(email)) {
      return { ok: false, message: 'Enter a valid email address (for example, name@example.com).' };
    }
  }
  return { ok: true, emails: normalizeContactEmails(nonEmpty) };
}

export function validateContactPhoneValues(
  values: readonly string[]
): { ok: true; phones: readonly string[] } | { ok: false; message: string } {
  const nonEmpty = values.filter((value) => value.trim().length > 0);
  if (nonEmpty.length > MAX_CONTACT_PHONES) {
    return { ok: false, message: `A project can have at most ${MAX_CONTACT_PHONES} phone numbers.` };
  }
  for (const phone of nonEmpty) {
    if (phone.trim().length > MAX_CONTACT_PHONE_LENGTH) {
      return { ok: false, message: 'Phone number is too long.' };
    }
  }
  return { ok: true, phones: normalizeContactPhones(nonEmpty) };
}

export function buildCrmContactDbWritePayload(
  emails: readonly string[],
  phones: readonly string[]
): {
  readonly contact_emails: readonly string[];
  readonly contact_phones: readonly string[];
  readonly email: string | null;
  readonly phone: string | null;
} {
  const normalizedEmails = normalizeContactEmails(emails);
  const normalizedPhones = normalizeContactPhones(phones);
  return {
    contact_emails: normalizedEmails,
    contact_phones: normalizedPhones,
    email: normalizedEmails[0] ?? null,
    phone: normalizedPhones[0] ?? null,
  };
}

export function resolveContactEmailsFromDb(
  contactEmails: readonly string[] | null | undefined,
  legacyEmail: string | null | undefined
): readonly string[] {
  if (contactEmails != null && contactEmails.length > 0) {
    return normalizeContactEmails(contactEmails);
  }
  const trimmed = legacyEmail?.trim() ?? '';
  return trimmed ? [trimmed] : [];
}

export function resolveContactPhonesFromDb(
  contactPhones: readonly string[] | null | undefined,
  legacyPhone: string | null | undefined
): readonly string[] {
  if (contactPhones != null && contactPhones.length > 0) {
    return normalizeContactPhones(contactPhones);
  }
  const trimmed = legacyPhone?.trim() ?? '';
  return trimmed ? [trimmed] : [];
}
