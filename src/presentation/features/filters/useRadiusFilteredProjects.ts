'use client';

import { useEffect, useMemo, useState } from 'react';
import type { CrmProjectSummary } from '@/domain/crm';
import { resolveProjectPostalCode } from '@/domain/geo/resolveProjectPostalCode';
import type { GeoCoordinates } from '@/domain/geo/geoCoordinates';
import { filterProjectsByRadius } from './filterProjectsByRadius';
import { lookupUsPostalCodeCoordinates } from './lookupUsPostalCodeCoordinates';
import type { RadiusFilterState } from './radiusFilterModel';
import { isRadiusFilterActive } from './radiusFilterModel';

export type UseRadiusFilteredProjectsResult<TProject extends CrmProjectSummary> = {
  readonly rows: readonly TProject[];
  readonly isGeocoding: boolean;
  readonly geocodingError: string | null;
  readonly isRadiusFilterActive: boolean;
};

export function useRadiusFilteredProjects<TProject extends CrmProjectSummary>(
  projects: readonly TProject[],
  radiusFilter: RadiusFilterState
): UseRadiusFilteredProjectsResult<TProject> {
  const radiusActive = isRadiusFilterActive(radiusFilter);
  const [centerCoordinates, setCenterCoordinates] = useState<GeoCoordinates | null>(null);
  const [coordinatesByPostalCode, setCoordinatesByPostalCode] = useState<
    ReadonlyMap<string, GeoCoordinates | null>
  >(new Map());
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodingError, setGeocodingError] = useState<string | null>(null);

  const requiredPostalCodes = useMemo(() => {
    if (!radiusActive) {
      return [] as string[];
    }

    const codes = new Set<string>();
    for (const project of projects) {
      const postalCode = resolveProjectPostalCode(project);
      if (postalCode != null) {
        codes.add(postalCode);
      }
    }

    const centerPostalCode = radiusFilter.postalCode.replace(/\D/g, '').slice(0, 5);
    if (centerPostalCode.length === 5) {
      codes.add(centerPostalCode);
    }

    return [...codes].sort();
  }, [projects, radiusActive, radiusFilter.postalCode]);

  useEffect(() => {
    if (!radiusActive) {
      setCenterCoordinates(null);
      setCoordinatesByPostalCode(new Map());
      setIsGeocoding(false);
      setGeocodingError(null);
      return;
    }

    let cancelled = false;

    const resolveCoordinates = async (): Promise<void> => {
      setIsGeocoding(true);
      setGeocodingError(null);

      try {
        const nextCoordinates = new Map<string, GeoCoordinates | null>();
        await Promise.all(
          requiredPostalCodes.map(async (postalCode) => {
            const coordinates = await lookupUsPostalCodeCoordinates(postalCode);
            nextCoordinates.set(postalCode, coordinates);
          })
        );

        if (cancelled) {
          return;
        }

        const centerPostalCode = radiusFilter.postalCode.replace(/\D/g, '').slice(0, 5);
        const center = nextCoordinates.get(centerPostalCode) ?? null;
        if (center == null) {
          setGeocodingError('ZIP code not found.');
          setCenterCoordinates(null);
          setCoordinatesByPostalCode(nextCoordinates);
          return;
        }

        setCenterCoordinates(center);
        setCoordinatesByPostalCode(nextCoordinates);
      } catch {
        if (!cancelled) {
          setGeocodingError('Could not look up ZIP code coordinates.');
          setCenterCoordinates(null);
          setCoordinatesByPostalCode(new Map());
        }
      } finally {
        if (!cancelled) {
          setIsGeocoding(false);
        }
      }
    };

    void resolveCoordinates();

    return () => {
      cancelled = true;
    };
  }, [radiusActive, radiusFilter.postalCode, requiredPostalCodes]);

  const rows = useMemo(() => {
    if (!radiusActive) {
      return projects;
    }

    if (isGeocoding || centerCoordinates == null) {
      return [] as TProject[];
    }

    return filterProjectsByRadius({
      projects,
      filter: radiusFilter,
      centerCoordinates,
      coordinatesByPostalCode,
    });
  }, [
    centerCoordinates,
    coordinatesByPostalCode,
    isGeocoding,
    projects,
    radiusActive,
    radiusFilter,
  ]);

  return {
    rows,
    isGeocoding,
    geocodingError,
    isRadiusFilterActive: radiusActive,
  };
}
