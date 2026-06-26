export const US_PHONE_DIGIT_COUNT = 10;

/** Strip formatting and cap at 10 US digits (drops a leading country code 1). */
export function extractUsPhoneDigits(value: string): string {
  let digits = value.replace(/\D/g, '');
  if (digits.length > US_PHONE_DIGIT_COUNT && digits.startsWith('1')) {
    digits = digits.slice(1);
  }
  return digits.slice(0, US_PHONE_DIGIT_COUNT);
}

/** Progressive US phone mask for inputs: (918) 671-3407 */
export function formatUsPhoneInput(value: string): string {
  const digits = extractUsPhoneDigits(value);
  if (digits.length === 0) return '';
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

/** Display/storage format for a complete US phone number. */
export function formatUsPhoneDisplay(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  const digits = extractUsPhoneDigits(trimmed);
  if (digits.length === US_PHONE_DIGIT_COUNT) {
    return formatUsPhoneInput(digits);
  }
  return trimmed;
}
