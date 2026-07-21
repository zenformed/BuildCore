import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  parseGooglePlacesAddress,
  type GooglePlaceAddressComponent,
} from './googlePlaceAddress';

function component(
  type: string,
  longText: string,
  shortText = longText
): GooglePlaceAddressComponent {
  return { types: [type], longText, shortText };
}

describe('parseGooglePlacesAddress', () => {
  it('maps a verified US address into BuildCore fields', () => {
    assert.deepEqual(
      parseGooglePlacesAddress({
        components: [
          component('street_number', '1600'),
          component('route', 'Amphitheatre Parkway', 'Amphitheatre Pkwy'),
          component('locality', 'Mountain View'),
          component('administrative_area_level_1', 'California', 'CA'),
          component('postal_code', '94043'),
        ],
        formattedAddress: '1600 Amphitheatre Pkwy, Mountain View, CA 94043, USA',
        latitude: 37.422,
        longitude: -122.084,
        placeId: 'verified-place',
      }),
      {
        addressLine1: '1600 Amphitheatre Parkway',
        city: 'Mountain View',
        state: 'CA',
        postalCode: '94043',
        latitude: 37.422,
        longitude: -122.084,
        formattedAddress: '1600 Amphitheatre Pkwy, Mountain View, CA 94043, USA',
        placeId: 'verified-place',
      }
    );
  });

  it('uses supported city fallbacks and rejects results without coordinates', () => {
    const components = [
      component('premise', 'Google Building 40'),
      component('postal_town', 'Mountain View'),
      component('administrative_area_level_1', 'California', 'CA'),
    ];
    assert.equal(
      parseGooglePlacesAddress({
        components,
        formattedAddress: 'Google Building 40, Mountain View, CA',
        latitude: Number.NaN,
        longitude: -122.084,
        placeId: 'invalid-place',
      }),
      null
    );
    assert.equal(
      parseGooglePlacesAddress({
        components,
        formattedAddress: 'Google Building 40, Mountain View, CA',
        latitude: 37.422,
        longitude: -122.084,
        placeId: 'valid-place',
      })?.city,
      'Mountain View'
    );
  });
});
