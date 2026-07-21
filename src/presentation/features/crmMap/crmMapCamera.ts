import type { CrmMapMarker } from './crmMapTypes';

export const CRM_MAP_DEFAULT_CENTER = { lat: 39.8283, lng: -98.5795 } as const;
export const CRM_MAP_DEFAULT_ZOOM = 4;
export const CRM_MAP_SELECTION_ZOOM = 14;

export function buildMarkerBounds(
  markers: readonly CrmMapMarker[]
): { north: number; south: number; east: number; west: number } | null {
  if (markers.length === 0) return null;
  let north = markers[0].latitude;
  let south = markers[0].latitude;
  let east = markers[0].longitude;
  let west = markers[0].longitude;
  for (const marker of markers) {
    north = Math.max(north, marker.latitude);
    south = Math.min(south, marker.latitude);
    east = Math.max(east, marker.longitude);
    west = Math.min(west, marker.longitude);
  }
  return { north, south, east, west };
}
