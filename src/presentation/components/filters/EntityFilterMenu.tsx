'use client';

import type { ReactElement } from 'react';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import {
  isRadiusFilterActive,
  type RadiusFilterState,
} from '@/presentation/features/filters/radiusFilterModel';
import { FilterMenu, RadiusFilterSection } from '@/presentation/components/filters';

export type EntityFilterMenuProps = {
  readonly radiusFilter: RadiusFilterState;
  readonly onRadiusFilterChange: (filter: RadiusFilterState) => void;
};

/** Composable entity filter menu. Additional filter sections can be added here over time. */
export function EntityFilterMenu({
  radiusFilter,
  onRadiusFilterChange,
}: EntityFilterMenuProps): ReactElement {
  const copy = content.crm.filters;

  return (
    <FilterMenu
      active={isRadiusFilterActive(radiusFilter)}
      ariaLabel={copy.menuAriaLabel}
      openMenuTitle={copy.openMenu}
    >
      <RadiusFilterSection filter={radiusFilter} onChange={onRadiusFilterChange} />
    </FilterMenu>
  );
}
