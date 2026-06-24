'use client';

import type { ChangeEvent, ReactElement } from 'react';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { CloseIcon } from '@/platform/icons/buildCoreDashboardShellIcons';
import {
  clampRadiusFilterMiles,
  clearRadiusFilter,
  RADIUS_FILTER_MAX_MILES,
  RADIUS_FILTER_MIN_MILES,
  RADIUS_FILTER_STEP_MILES,
  type RadiusFilterState,
} from '@/presentation/features/filters/radiusFilterModel';
import { FilterMenuSection } from './FilterMenuSection';
import styles from './filters.module.css';

export type RadiusFilterSectionProps = {
  readonly filter: RadiusFilterState;
  readonly onChange: (filter: RadiusFilterState) => void;
};

export function RadiusFilterSection({
  filter,
  onChange,
}: RadiusFilterSectionProps): ReactElement {
  const copy = content.crm.filters.radius;

  const handlePostalCodeChange = (event: ChangeEvent<HTMLInputElement>): void => {
    onChange({
      ...filter,
      postalCode: event.target.value,
    });
  };

  const handleRadiusInputChange = (event: ChangeEvent<HTMLInputElement>): void => {
    onChange({
      ...filter,
      radiusMiles: clampRadiusFilterMiles(Number(event.target.value)),
    });
  };

  const handleRadiusSliderChange = (event: ChangeEvent<HTMLInputElement>): void => {
    onChange({
      ...filter,
      radiusMiles: clampRadiusFilterMiles(Number(event.target.value)),
    });
  };

  return (
    <FilterMenuSection title={copy.sectionLabel}>
      <div className={styles.radiusFilterIndentedRow}>
        <div className={styles.radiusFilterColumns}>
          <label className={styles.radiusFilterColumn}>
            <span className={styles.radiusFilterLabel}>{copy.zipCodeLabel}</span>
            <div className={styles.radiusFilterInputWrap}>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="postal-code"
                className={styles.radiusFilterInput}
                value={filter.postalCode}
                aria-label={copy.zipCodeAriaLabel}
                onChange={handlePostalCodeChange}
              />
              {filter.postalCode.length > 0 ? (
                <button
                  type="button"
                  className={styles.radiusFilterInputClear}
                  aria-label={copy.clearZipCodeAriaLabel}
                  onClick={() => onChange(clearRadiusFilter(filter))}
                >
                  <CloseIcon className={styles.radiusFilterInputClearIcon} />
                </button>
              ) : null}
            </div>
          </label>
          <label className={styles.radiusFilterColumn}>
            <span className={styles.radiusFilterLabel}>{copy.radiusLabel}</span>
            <div className={styles.radiusFilterRadiusRow}>
              <input
                type="number"
                min={RADIUS_FILTER_MIN_MILES}
                max={RADIUS_FILTER_MAX_MILES}
                step={RADIUS_FILTER_STEP_MILES}
                className={styles.radiusFilterRadiusInput}
                value={filter.radiusMiles}
                aria-label={copy.radiusInputAriaLabel}
                onChange={handleRadiusInputChange}
              />
              <span className={styles.radiusFilterUnit}>{copy.milesUnit}</span>
            </div>
          </label>
        </div>
      </div>
      <div className={styles.radiusFilterIndentedRow}>
        <div className={styles.radiusFilterSliderWrap}>
          <input
            type="range"
            min={RADIUS_FILTER_MIN_MILES}
            max={RADIUS_FILTER_MAX_MILES}
            step={RADIUS_FILTER_STEP_MILES}
            className={styles.radiusFilterSlider}
            value={filter.radiusMiles}
            aria-label={copy.sliderAriaLabel}
            aria-valuemin={RADIUS_FILTER_MIN_MILES}
            aria-valuemax={RADIUS_FILTER_MAX_MILES}
            aria-valuenow={filter.radiusMiles}
            onChange={handleRadiusSliderChange}
          />
          <div className={styles.radiusFilterSliderLabels}>
            <span>{RADIUS_FILTER_MIN_MILES}</span>
            <span className={styles.radiusFilterSliderValue}>
              {filter.radiusMiles} {copy.milesUnit}
            </span>
            <span>{RADIUS_FILTER_MAX_MILES}</span>
          </div>
        </div>
      </div>
    </FilterMenuSection>
  );
}
