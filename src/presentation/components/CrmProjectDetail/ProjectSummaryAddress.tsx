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
};

export function ProjectSummaryAddress({ address, label }: ProjectSummaryAddressProps): ReactElement {
  const formattedAddress = formatCrmProjectAddressLine(address);
  const mapsUrl = buildCrmProjectMapsSearchUrl(address);
  const displayText = formattedAddress ?? '—';

  return (
    <div
      className={`${styles.summaryMetric} ${styles.summaryMetricAddress}`}
      role="group"
      aria-label={label}
    >
      <div className={styles.summaryValue}>
        {formattedAddress != null && mapsUrl != null ? (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`${styles.summaryText} ${styles.summaryLink}`}
            title={formattedAddress}
          >
            {formattedAddress}
          </a>
        ) : (
          <span className={styles.summaryText} title={formattedAddress ?? undefined}>
            {displayText}
          </span>
        )}
      </div>
      <span className={styles.summaryLabel}>{label}</span>
    </div>
  );
}
