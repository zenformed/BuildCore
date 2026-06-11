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

export type CrmProjectAddressEnvelopeLines = {
  readonly line1: string | null;
  readonly line2: string | null;
};

function formatCrmProjectAddressLocalityLine(address: CrmProjectAddress): string | null {
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

  return locality.length > 0 ? locality : null;
}

export function formatCrmProjectAddressLine(address: CrmProjectAddress): string | null {
  const parts: string[] = [];

  const line1 = address.addressLine1?.trim();
  const line2 = address.addressLine2?.trim();
  if (line1) parts.push(line1);
  if (line2) parts.push(line2);

  const locality = formatCrmProjectAddressLocalityLine(address);
  if (locality) parts.push(locality);

  return parts.length > 0 ? parts.join(', ') : null;
}

/** Envelope-style display: street line(s) with trailing comma, then city/state/zip line. */
export function formatCrmProjectAddressEnvelopeLines(
  address: CrmProjectAddress
): CrmProjectAddressEnvelopeLines {
  const streetParts: string[] = [];
  const addressLine1 = address.addressLine1?.trim();
  const addressLine2 = address.addressLine2?.trim();
  if (addressLine1) streetParts.push(addressLine1);
  if (addressLine2) streetParts.push(addressLine2);

  const locality = formatCrmProjectAddressLocalityLine(address);

  if (streetParts.length === 0 && !locality) {
    return { line1: null, line2: null };
  }
  if (streetParts.length === 0) {
    return { line1: null, line2: locality };
  }
  if (!locality) {
    return { line1: streetParts.join(', '), line2: null };
  }

  return {
    line1: `${streetParts.join(', ')},`,
    line2: locality,
  };
}

export function crmProjectAddressSearchText(address: CrmProjectAddress): string {
  const envelope = formatCrmProjectAddressEnvelopeLines(address);
  const formatted = formatCrmProjectAddressLine(address);

  return [
    address.addressLine1,
    address.addressLine2,
    address.city,
    address.state,
    address.postalCode,
    formatted,
    envelope.line1,
    envelope.line2,
  ]
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .join(' ');
}

export function buildCrmProjectMapsSearchUrl(address: CrmProjectAddress): string | null {
  const formatted = formatCrmProjectAddressLine(address);
  if (!formatted) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(formatted)}`;
}
