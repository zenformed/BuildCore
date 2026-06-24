import type { GeoCoordinates } from '@/domain/geo/geoCoordinates';
import { normalizeUsPostalCode } from '@/domain/geo/normalizeUsPostalCode';
import { getCrmDataSource } from '@/infrastructure/config/crmDataSource';
import { geocodeUsPostalCode as geocodeUsPostalCodeDirect } from '@/infrastructure/geo/geocodeUsPostalCode';
import { getSession } from '@/infrastructure/supabase/supabaseClient';

const coordinatesCache = new Map<string, GeoCoordinates | null>();

async function fetchPostalCodeCoordinatesFromApi(
  postalCode: string
): Promise<GeoCoordinates | null> {
  const session = await getSession();
  const token = session?.access_token;
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(
    `/api/geo/us-postal-code?code=${encodeURIComponent(postalCode)}`,
    {
      method: 'GET',
      headers,
      cache: 'no-store',
    }
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error('Geocoding lookup failed.');
  }

  const payload = (await response.json()) as {
    latitude?: number;
    longitude?: number;
  };

  if (payload.latitude == null || payload.longitude == null) {
    return null;
  }

  return {
    latitude: payload.latitude,
    longitude: payload.longitude,
  };
}

export async function lookupUsPostalCodeCoordinates(
  postalCode: string
): Promise<GeoCoordinates | null> {
  const normalized = normalizeUsPostalCode(postalCode);
  if (normalized == null) {
    return null;
  }

  if (coordinatesCache.has(normalized)) {
    return coordinatesCache.get(normalized) ?? null;
  }

  const coordinates =
    getCrmDataSource() === 'api'
      ? await fetchPostalCodeCoordinatesFromApi(normalized)
      : await geocodeUsPostalCodeDirect(normalized);

  coordinatesCache.set(normalized, coordinates);
  return coordinates;
}

export function primeUsPostalCodeCoordinatesCache(
  postalCode: string,
  coordinates: GeoCoordinates | null
): void {
  const normalized = normalizeUsPostalCode(postalCode);
  if (normalized == null) {
    return;
  }
  coordinatesCache.set(normalized, coordinates);
}

export function clearUsPostalCodeCoordinatesCache(): void {
  coordinatesCache.clear();
}
