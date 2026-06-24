import { normalizeUsPostalCode } from '@/domain/geo/normalizeUsPostalCode';

export const RADIUS_FILTER_MIN_MILES = 0;
export const RADIUS_FILTER_MAX_MILES = 250;
export const RADIUS_FILTER_STEP_MILES = 5;
export const RADIUS_FILTER_DEFAULT_MILES = 25;

export type RadiusFilterState = {
  readonly postalCode: string;
  readonly radiusMiles: number;
};

export const EMPTY_RADIUS_FILTER: RadiusFilterState = {
  postalCode: '',
  radiusMiles: RADIUS_FILTER_DEFAULT_MILES,
};

export function clampRadiusFilterMiles(value: number): number {
  if (!Number.isFinite(value)) {
    return RADIUS_FILTER_DEFAULT_MILES;
  }
  const stepped = Math.round(value / RADIUS_FILTER_STEP_MILES) * RADIUS_FILTER_STEP_MILES;
  return Math.min(RADIUS_FILTER_MAX_MILES, Math.max(RADIUS_FILTER_MIN_MILES, stepped));
}

export function isRadiusFilterActive(filter: RadiusFilterState): boolean {
  return normalizeUsPostalCode(filter.postalCode) != null;
}

export function clearRadiusFilter(filter: RadiusFilterState): RadiusFilterState {
  return {
    ...filter,
    postalCode: '',
  };
}
