import { normalizeUsPostalCode } from '@/domain/geo/normalizeUsPostalCode';

export const MAX_PROJECT_NOTES_LENGTH = 200;

const CITY_PATTERN = /^[A-Za-z][A-Za-z .'-]*$/;

export function sanitizeCityInput(value: string): string {
  return value.replace(/[^A-Za-z .'-]/g, '');
}

export function sanitizePostalCodeInput(value: string): string {
  return value.replace(/\D/g, '').slice(0, 5);
}

export function sanitizeProjectNotesInput(value: string): string {
  return value.slice(0, MAX_PROJECT_NOTES_LENGTH);
}

export function validateOptionalCity(
  city: string
): { ok: true; city: string | null } | { ok: false; message: string } {
  const trimmed = city.trim();
  if (!trimmed) return { ok: true, city: null };
  if (!CITY_PATTERN.test(trimmed)) {
    return { ok: false, message: 'City can only contain letters, spaces, hyphens, apostrophes, and periods.' };
  }
  return { ok: true, city: trimmed };
}

export function validateOptionalPostalCode(
  postalCode: string
): { ok: true; postalCode: string | null } | { ok: false; message: string } {
  const trimmed = postalCode.trim();
  if (!trimmed) return { ok: true, postalCode: null };
  const normalized = normalizeUsPostalCode(trimmed);
  if (normalized == null || normalized.length !== 5) {
    return { ok: false, message: 'Zip code must be exactly 5 digits.' };
  }
  return { ok: true, postalCode: normalized };
}

export function validateRequiredCity(
  city: string
): { ok: true; city: string } | { ok: false; message: string } {
  const validated = validateOptionalCity(city);
  if (!validated.ok) return validated;
  if (!validated.city) {
    return { ok: false, message: 'City is required.' };
  }
  return { ok: true, city: validated.city };
}

export function validateRequiredPostalCode(
  postalCode: string
): { ok: true; postalCode: string } | { ok: false; message: string } {
  const validated = validateOptionalPostalCode(postalCode);
  if (!validated.ok) return validated;
  if (!validated.postalCode) {
    return { ok: false, message: 'ZIP is required.' };
  }
  return { ok: true, postalCode: validated.postalCode };
}

export function validateProjectNotes(
  notes: string
): { ok: true; notes: string | null } | { ok: false; message: string } {
  const trimmed = notes.trim();
  if (!trimmed) return { ok: true, notes: null };
  if (trimmed.length > MAX_PROJECT_NOTES_LENGTH) {
    return { ok: false, message: `Notes must be ${MAX_PROJECT_NOTES_LENGTH} characters or fewer.` };
  }
  return { ok: true, notes: trimmed };
}
