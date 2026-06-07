export type CrmProjectAddress = {
  readonly addressLine1: string | null;
  readonly addressLine2: string | null;
  readonly city: string | null;
  readonly state: string | null;
  readonly postalCode: string | null;
};

export function emptyCrmProjectAddress(): CrmProjectAddress {
  return {
    addressLine1: null,
    addressLine2: null,
    city: null,
    state: null,
    postalCode: null,
  };
}

export function formatCrmProjectAddressLine(address: CrmProjectAddress): string | null {
  const parts: string[] = [];

  const line1 = address.addressLine1?.trim();
  const line2 = address.addressLine2?.trim();
  if (line1) parts.push(line1);
  if (line2) parts.push(line2);

  const city = address.city?.trim();
  const state = address.state?.trim();
  const postalCode = address.postalCode?.trim();

  let locality = city ?? '';
  if (state) {
    locality = locality ? `${locality}, ${state}` : state;
  }
  if (postalCode) {
    locality = locality ? `${locality} ${postalCode}` : postalCode;
  }
  if (locality) parts.push(locality);

  return parts.length > 0 ? parts.join(', ') : null;
}

export function buildCrmProjectMapsSearchUrl(address: CrmProjectAddress): string | null {
  const formatted = formatCrmProjectAddressLine(address);
  if (!formatted) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(formatted)}`;
}
