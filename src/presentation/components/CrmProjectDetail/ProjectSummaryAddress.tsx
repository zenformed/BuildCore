'use client';

import type { ReactElement } from 'react';
import type { CrmProjectAddress } from '@/domain/crm/projectAddress';
import {
  buildCrmProjectMapsSearchUrl,
  formatCrmProjectAddressLine,
} from '@/domain/crm/projectAddress';
import styles from './ProjectDetail.module.css';

export type ProjectSummaryAddressProps = {
  readonly address: CrmProjectAddress;
  readonly label: string;
  readonly layout?: 'strip' | 'mobile';
};

export function ProjectSummaryAddress({
  address,
  label,
  layout = 'strip',
}: ProjectSummaryAddressProps): ReactElement {
  const formattedAddress = formatCrmProjectAddressLine(address);
  const mapsUrl = buildCrmProjectMapsSearchUrl(address);
  const displayText = formattedAddress ?? '—';

  const addressValue =
    formattedAddress != null && mapsUrl != null ? (
      <a
        href={mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`${styles.summaryText} ${styles.summaryLink} ${layout === 'mobile' ? styles.projectInfoMobileValue : ''}`}
        title={formattedAddress}
      >
        {formattedAddress}
      </a>
    ) : (
      <span
        className={`${styles.summaryText}${layout === 'mobile' ? ` ${styles.projectInfoMobileValue}` : ''}`}
        title={formattedAddress ?? undefined}
      >
        {displayText}
      </span>
    );

  if (layout === 'mobile') {
    return (
      <div className={styles.projectInfoMobileCellFull} role="group" aria-label={label}>
        <span className={styles.projectInfoMobileLabel}>{label}</span>
        <div className={styles.projectInfoMobileValueWrap}>{addressValue}</div>
      </div>
    );
  }

  return (
    <div
      className={`${styles.summaryMetric} ${styles.summaryMetricAddress}`}
      role="group"
      aria-label={label}
    >
      <div className={styles.summaryValue}>{addressValue}</div>
      <span className={styles.summaryLabel}>{label}</span>
    </div>
  );
}
