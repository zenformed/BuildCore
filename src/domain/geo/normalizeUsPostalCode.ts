/** Returns the 5-digit US ZIP base code, or null when input is not a valid ZIP. */
export function normalizeUsPostalCode(input: string): string | null {
  const digits = input.replace(/\D/g, '');
  if (digits.length < 5) {
    return null;
  }
  return digits.slice(0, 5);
}
