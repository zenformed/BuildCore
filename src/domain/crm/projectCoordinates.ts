export type CrmProjectCoordinates = {
  readonly latitude: number;
  readonly longitude: number;
};

export type CrmProjectCoordinateValidationResult =
  | { readonly ok: true; readonly coordinates: CrmProjectCoordinates | null }
  | {
      readonly ok: false;
      readonly field: 'latitude' | 'longitude';
      readonly message: string;
    };

export function isValidCrmProjectLatitude(value: number): boolean {
  return Number.isFinite(value) && value >= -90 && value <= 90;
}

export function isValidCrmProjectLongitude(value: number): boolean {
  return Number.isFinite(value) && value >= -180 && value <= 180;
}

/** Validates the nullable all-or-neither coordinate pair used by project writes. */
export function validateCrmProjectCoordinates(
  latitude: number | null,
  longitude: number | null
): CrmProjectCoordinateValidationResult {
  if (latitude == null && longitude == null) {
    return { ok: true, coordinates: null };
  }
  if (latitude == null) {
    return { ok: false, field: 'latitude', message: 'Latitude is required.' };
  }
  if (!isValidCrmProjectLatitude(latitude)) {
    return {
      ok: false,
      field: 'latitude',
      message: 'Latitude must be between -90 and 90.',
    };
  }
  if (longitude == null) {
    return { ok: false, field: 'longitude', message: 'Longitude is required.' };
  }
  if (!isValidCrmProjectLongitude(longitude)) {
    return {
      ok: false,
      field: 'longitude',
      message: 'Longitude must be between -180 and 180.',
    };
  }
  return { ok: true, coordinates: { latitude, longitude } };
}
