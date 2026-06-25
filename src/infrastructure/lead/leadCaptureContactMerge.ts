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
    readonly phone: string;
    readonly clientId: string;
  }
): {
  readonly full_name: string;
  readonly phone: string;
  readonly client_id: string;
} {
  const existingName = existing.full_name.trim();
  const existingPhone = existing.phone?.trim() ?? '';

  return {
    full_name: existingName.length > 0 ? existingName : input.fullName,
    phone: existingPhone.length > 0 ? existingPhone : input.phone,
    client_id: existing.client_id ?? input.clientId,
  };
}
