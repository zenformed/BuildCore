import { buildCrmContactDbWritePayload } from '@/domain/crm/contactMultiValue';

export type LeadCaptureContactRow = {
  readonly id: string;
  readonly full_name: string;
  readonly email: string | null;
  readonly phone: string | null;
  readonly client_id: string | null;
};

export function buildLeadCaptureFullName(firstName: string, lastName: string): string {
  return `${firstName.trim()} ${lastName.trim()}`.replace(/\s+/g, ' ').trim();
}

export function mergeLeadCaptureContactFields(
  existing: LeadCaptureContactRow,
  input: {
    readonly fullName: string;
    readonly phones: readonly string[];
    readonly clientId: string;
  }
): {
  readonly full_name: string;
  readonly client_id: string;
  readonly contact_emails: readonly string[];
  readonly contact_phones: readonly string[];
  readonly email: string | null;
  readonly phone: string | null;
} {
  const existingName = existing.full_name.trim();
  const existingPhone = existing.phone?.trim() ?? '';
  const submittedPhones = input.phones.map((phone) => phone.trim()).filter(Boolean);
  const nextPhones = existingPhone.length > 0 ? [existingPhone] : submittedPhones;
  const existingEmails = existing.email?.trim() ? [existing.email.trim()] : [];
  const contactPayload = buildCrmContactDbWritePayload(existingEmails, nextPhones);

  return {
    full_name: existingName.length > 0 ? existingName : input.fullName,
    client_id: existing.client_id ?? input.clientId,
    ...contactPayload,
  };
}
