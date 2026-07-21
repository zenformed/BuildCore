export type GooglePlaceAddressComponent = {
  readonly longText: string | null;
  readonly shortText: string | null;
  readonly types: readonly string[];
};

export type GooglePlacesAddressSelection = {
  readonly addressLine1: string;
  readonly city: string;
  readonly state: string;
  readonly postalCode: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly formattedAddress: string;
  readonly placeId: string;
};

function componentText(
  components: readonly GooglePlaceAddressComponent[],
  type: string,
  text: 'longText' | 'shortText' = 'longText'
): string {
  const component = components.find((candidate) => candidate.types.includes(type));
  return component?.[text]?.trim() ?? '';
}

export function parseGooglePlacesAddress(params: {
  readonly components: readonly GooglePlaceAddressComponent[];
  readonly formattedAddress: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly placeId: string;
}): GooglePlacesAddressSelection | null {
  const { components, formattedAddress, latitude, longitude, placeId } = params;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  const streetNumber = componentText(components, 'street_number');
  const route = componentText(components, 'route');
  const premise = componentText(components, 'premise');
  const subpremise = componentText(components, 'subpremise');
  const street = [streetNumber, route].filter(Boolean).join(' ').trim();
  const baseAddress = street || premise || formattedAddress.split(',')[0]?.trim() || '';
  const addressLine1 =
    baseAddress && subpremise ? `${baseAddress}, ${subpremise}` : baseAddress;
  if (!addressLine1) return null;

  const city =
    componentText(components, 'locality') ||
    componentText(components, 'postal_town') ||
    componentText(components, 'sublocality_level_1') ||
    componentText(components, 'administrative_area_level_2');

  return {
    addressLine1,
    city,
    state: componentText(components, 'administrative_area_level_1', 'shortText'),
    postalCode: componentText(components, 'postal_code'),
    latitude,
    longitude,
    formattedAddress: formattedAddress.trim(),
    placeId,
  };
}
