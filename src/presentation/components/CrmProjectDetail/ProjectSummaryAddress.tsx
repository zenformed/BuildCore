'use client';

import type { ReactElement, ReactNode } from 'react';
import type { CrmProjectAddress } from '@/domain/crm/projectAddress';
import {
  buildCrmProjectLocationMapsSearchUrl,
  formatCrmProjectAddressEnvelopeLines,
  formatCrmProjectCoordinateLine,
  formatCrmProjectLocationLine,
} from '@/domain/crm/projectAddress';
import styles from './ProjectDetail.module.css';

export type ProjectSummaryAddressProps = {
  readonly address: CrmProjectAddress;
  readonly latitude?: number | null;
  readonly longitude?: number | null;
  readonly label: string;
  readonly layout?: 'strip' | 'mobile' | 'value';
  readonly editAction?: ReactNode;
};

function MobileAddressValue({
  address,
  latitude = null,
  longitude = null,
}: {
  readonly address: CrmProjectAddress;
  readonly latitude: number | null;
  readonly longitude: number | null;
}): ReactElement {
  const envelope = formatCrmProjectAddressEnvelopeLines(address);
  const coordinateLine = formatCrmProjectCoordinateLine(latitude, longitude);
  const formattedLocation = formatCrmProjectLocationLine(address, latitude, longitude);
  const mapsUrl = buildCrmProjectLocationMapsSearchUrl(address, latitude, longitude);
  const hasAddress = envelope.line1 != null || envelope.line2 != null;
  const valueClass = `${styles.summaryText} ${styles.projectInfoMobileValue}`;

  if (!hasAddress && coordinateLine == null) {
    return <span className={valueClass}>—</span>;
  }

  const content = (
    <>
      {envelope.line1 ? <span className={styles.projectInfoMobileAddressLine}>{envelope.line1}</span> : null}
      {envelope.line2 ? <span className={styles.projectInfoMobileAddressLine}>{envelope.line2}</span> : null}
      {!hasAddress && coordinateLine ? (
        <span className={styles.projectInfoMobileAddressLine}>{coordinateLine}</span>
      ) : null}
    </>
  );

  if (formattedLocation != null && mapsUrl != null) {
    return (
      <a
        href={mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`${valueClass} ${styles.summaryLink} ${styles.projectInfoMobileAddressLink}`}
        title={formattedLocation}
      >
        {content}
      </a>
    );
  }

  return (
    <span className={valueClass} title={formattedLocation ?? undefined}>
      {content}
    </span>
  );
}

export function ProjectSummaryAddress({
  address,
  latitude = null,
  longitude = null,
  label,
  layout = 'strip',
  editAction,
}: ProjectSummaryAddressProps): ReactElement {
  const formattedLocation = formatCrmProjectLocationLine(address, latitude, longitude);
  const mapsUrl = buildCrmProjectLocationMapsSearchUrl(address, latitude, longitude);
  const displayText = formattedLocation ?? '—';

  const addressValue =
    formattedLocation != null && mapsUrl != null ? (
      <a
        href={mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`${styles.summaryText} ${styles.summaryLink}${layout === 'mobile' ? ` ${styles.projectInfoMobileValue}` : ''}`}
        title={formattedLocation}
      >
        {formattedLocation}
      </a>
    ) : (
      <span
        className={`${styles.summaryText}${layout === 'mobile' ? ` ${styles.projectInfoMobileValue}` : ''}`}
        title={formattedLocation ?? undefined}
      >
        {displayText}
      </span>
    );

  if (layout === 'mobile') {
    return (
      <div className={styles.projectInfoMobileAddressSection} role="group" aria-label={label}>
        <span className={styles.projectInfoMobileLabel}>{label}</span>
        <div className={styles.projectInfoMobileAddressValueRow}>
          <div className={styles.projectInfoMobileAddressValue}>
            <MobileAddressValue
              address={address}
              latitude={latitude}
              longitude={longitude}
            />
          </div>
          {editAction ?? null}
        </div>
      </div>
    );
  }

  if (layout === 'value') {
    return addressValue;
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
