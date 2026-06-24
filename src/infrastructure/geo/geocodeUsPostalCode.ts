import type { GeoCoordinates } from '@/domain/geo/geoCoordinates';
import { normalizeUsPostalCode } from '@/domain/geo/normalizeUsPostalCode';

type ZippopotamResponse = {
  readonly places?: readonly {
    readonly latitude?: string;
    readonly longitude?: string;
  }[];
};

export async function geocodeUsPostalCode(postalCode: string): Promise<GeoCoordinates | null> {
  const normalized = normalizeUsPostalCode(postalCode);
  if (normalized == null) {
    return null;
  }

  const response = await fetch(`https://api.zippopotam.us/us/${normalized}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    cache: 'force-cache',
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Geocoding failed with status ${response.status}`);
  }

  const payload = (await response.json()) as ZippopotamResponse;
  const place = payload.places?.[0];
  if (place?.latitude == null || place.longitude == null) {
    return null;
  }

  const latitude = Number.parseFloat(place.latitude);
  const longitude = Number.parseFloat(place.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return { latitude, longitude };
}
