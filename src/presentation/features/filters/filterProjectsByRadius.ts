import type { GeoCoordinates } from '@/domain/geo/geoCoordinates';
import { haversineDistanceMiles } from '@/domain/geo/haversineDistanceMiles';
import { normalizeUsPostalCode } from '@/domain/geo/normalizeUsPostalCode';
import { resolveProjectPostalCode } from '@/domain/geo/resolveProjectPostalCode';
import type { CrmProjectSummary } from '@/domain/crm';
import type { RadiusFilterState } from './radiusFilterModel';
import { isRadiusFilterActive } from './radiusFilterModel';

export function filterProjectsByRadius<
  TProject extends Pick<CrmProjectSummary, 'address'>,
>(input: {
  readonly projects: readonly TProject[];
  readonly filter: RadiusFilterState;
  readonly centerCoordinates: GeoCoordinates | null;
  readonly coordinatesByPostalCode: ReadonlyMap<string, GeoCoordinates | null>;
}): TProject[] {
  if (!isRadiusFilterActive(input.filter) || input.centerCoordinates == null) {
    return [...input.projects];
  }

  const centerPostalCode = normalizeUsPostalCode(input.filter.postalCode);
  if (centerPostalCode == null) {
    return [...input.projects];
  }

  const center = input.centerCoordinates;
  if (center == null) {
    return [...input.projects];
  }

  return input.projects.filter((project) => {
    const projectPostalCode = resolveProjectPostalCode(project);
    if (projectPostalCode == null) {
      return false;
    }

    const projectCoordinates =
      input.coordinatesByPostalCode.get(projectPostalCode) ??
      (projectPostalCode === centerPostalCode ? input.centerCoordinates : null);

    if (projectCoordinates == null) {
      return false;
    }

    const distanceMiles = haversineDistanceMiles(center, projectCoordinates);
    return distanceMiles <= input.filter.radiusMiles;
  });
}
