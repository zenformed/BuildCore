/**
 * Shared validation for optional document capture location on prepare.
 */

export type DocumentCaptureLocationPayload = {
  readonly latitude: number;
  readonly longitude: number;
  readonly locationAccuracyMeters: number | null;
  readonly locationSource: 'device_capture' | 'exif' | 'manual';
  readonly locationCapturedAt: string;
};

const LOCATION_SOURCES = new Set(['device_capture', 'exif', 'manual']);

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * Parse optional location fields from a prepare JSON body.
 * Returns null when absent; throws Error with a user-facing message when invalid.
 */
export function parseDocumentCaptureLocationPayload(
  body: Record<string, unknown>
): DocumentCaptureLocationPayload | null {
  const hasAny =
    body.latitude != null ||
    body.longitude != null ||
    body.locationSource != null ||
    body.locationCapturedAt != null ||
    body.locationAccuracyMeters != null;

  if (!hasAny) return null;

  const latitude = typeof body.latitude === 'number' ? body.latitude : Number(body.latitude);
  const longitude = typeof body.longitude === 'number' ? body.longitude : Number(body.longitude);
  if (!isFiniteNumber(latitude) || !isFiniteNumber(longitude)) {
    throw new Error('Invalid capture location coordinates.');
  }
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
    throw new Error('Invalid capture location coordinates.');
  }

  const locationSource =
    typeof body.locationSource === 'string' ? body.locationSource.trim() : '';
  if (!LOCATION_SOURCES.has(locationSource)) {
    throw new Error('Invalid locationSource.');
  }

  const locationCapturedAt =
    typeof body.locationCapturedAt === 'string' ? body.locationCapturedAt.trim() : '';
  if (!locationCapturedAt || Number.isNaN(Date.parse(locationCapturedAt))) {
    throw new Error('Invalid locationCapturedAt.');
  }

  let locationAccuracyMeters: number | null = null;
  if (body.locationAccuracyMeters != null && body.locationAccuracyMeters !== '') {
    const accuracy =
      typeof body.locationAccuracyMeters === 'number'
        ? body.locationAccuracyMeters
        : Number(body.locationAccuracyMeters);
    if (!isFiniteNumber(accuracy) || accuracy < 0) {
      throw new Error('Invalid locationAccuracyMeters.');
    }
    locationAccuracyMeters = accuracy;
  }

  return {
    latitude,
    longitude,
    locationAccuracyMeters,
    locationSource: locationSource as DocumentCaptureLocationPayload['locationSource'],
    locationCapturedAt: new Date(locationCapturedAt).toISOString(),
  };
}

export function documentCaptureLocationInsertFields(
  location: DocumentCaptureLocationPayload | null | undefined
): {
  latitude: number | null;
  longitude: number | null;
  location_accuracy_meters: number | null;
  location_source: string | null;
  location_captured_at: string | null;
} {
  if (location == null) {
    return {
      latitude: null,
      longitude: null,
      location_accuracy_meters: null,
      location_source: null,
      location_captured_at: null,
    };
  }
  return {
    latitude: location.latitude,
    longitude: location.longitude,
    location_accuracy_meters: location.locationAccuracyMeters,
    location_source: location.locationSource,
    location_captured_at: location.locationCapturedAt,
  };
}
