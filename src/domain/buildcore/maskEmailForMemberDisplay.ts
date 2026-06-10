const MEMBER_EMAIL_LOCAL_VISIBLE_PREFIX_LENGTH = 3;

/** Masks the local part of an email for member-role display, e.g. djhindu17@gmail.com → djh*******@gmail.com */
export function maskEmailForMemberDisplay(email: string): string {
  const trimmed = email.trim();
  if (!trimmed) return '';

  const atIndex = trimmed.indexOf('@');
  if (atIndex <= 0) return trimmed;

  const localPart = trimmed.slice(0, atIndex);
  const domain = trimmed.slice(atIndex);

  if (localPart.length <= MEMBER_EMAIL_LOCAL_VISIBLE_PREFIX_LENGTH) {
    return trimmed;
  }

  const hiddenPart = localPart.slice(MEMBER_EMAIL_LOCAL_VISIBLE_PREFIX_LENGTH);
  if (hiddenPart.length > 0 && hiddenPart.split('').every((char) => char === '*')) {
    return trimmed;
  }

  return `${localPart.slice(0, MEMBER_EMAIL_LOCAL_VISIBLE_PREFIX_LENGTH)}${'*'.repeat(hiddenPart.length)}${domain}`;
}
