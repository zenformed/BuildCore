export function initialsFromPersonName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) {
    const word = parts[0]!;
    if (word.length >= 2) return word.slice(0, 2).toUpperCase();
    return word.slice(0, 1).toUpperCase();
  }
  return `${parts[0]![0] ?? ''}${parts[parts.length - 1]![0] ?? ''}`.toUpperCase();
}

export function displayNameFromEmail(email: string | null | undefined, fallbackId: string): string {
  if (email) {
    const local = email.split('@')[0]?.trim();
    if (local) return local.replace(/[._-]+/g, ' ');
  }
  return `Member ${fallbackId.slice(0, 8)}`;
}

export function displayNameFromProfileParts(input: {
  readonly displayName?: string | null;
  readonly firstName?: string | null;
  readonly lastName?: string | null;
  readonly email?: string | null;
  readonly userId: string;
}): string {
  const first = input.firstName?.trim() ?? '';
  const last = input.lastName?.trim() ?? '';
  if (first || last) {
    return `${first} ${last}`.trim();
  }
  const fromDisplay = input.displayName?.trim();
  if (fromDisplay) return fromDisplay;
  return displayNameFromEmail(input.email, input.userId);
}
