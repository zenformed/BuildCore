'use client';

import { useMemo } from 'react';
import type { CrmProjectSummary } from '@/domain/crm';
import { filterSubprojects } from '@/presentation/features/crmProjectDetail/useCrmProjectChildSummaries';
import type { RadiusFilterState } from '@/presentation/features/filters/radiusFilterModel';
import { useRadiusFilteredProjects } from '@/presentation/features/filters/useRadiusFilteredProjects';

export type UseSubprojectListRowsResult = {
  readonly rows: readonly CrmProjectSummary[];
  readonly isRadiusGeocoding: boolean;
  readonly radiusGeocodingError: string | null;
  readonly isRadiusFilterActive: boolean;
  readonly isNarrowingResults: boolean;
};

export function useSubprojectListRows(
  allRows: readonly CrmProjectSummary[],
  searchQuery: string,
  radiusFilter: RadiusFilterState
): UseSubprojectListRowsResult {
  const searchFilteredRows = useMemo(
    () => filterSubprojects(allRows, searchQuery),
    [allRows, searchQuery]
  );

  const {
    rows,
    isGeocoding,
    geocodingError,
    isRadiusFilterActive: radiusActive,
  } = useRadiusFilteredProjects(searchFilteredRows, radiusFilter);

  const isNarrowingResults =
    searchQuery.trim().length > 0 || radiusActive || isGeocoding;

  return {
    rows,
    isRadiusGeocoding: isGeocoding,
    radiusGeocodingError: geocodingError,
    isRadiusFilterActive: radiusActive,
    isNarrowingResults,
  };
}
