'use client';

import type { ReactElement, ReactNode } from 'react';
import type { CrmProjectAddress } from '@/domain/crm/projectAddress';
import {
  buildCrmProjectMapsSearchUrl,
  formatCrmProjectAddressEnvelopeLines,
  formatCrmProjectAddressLine,
} from '@/domain/crm/projectAddress';
import styles from './ProjectDetail.module.css';

export type ProjectSummaryAddressProps = {
  readonly address: CrmProjectAddress;
  readonly label: string;
  readonly layout?: 'strip' | 'mobile';
  readonly editAction?: ReactNode;
};

function MobileAddressValue({
  address,
}: {
  readonly address: CrmProjectAddress;
}): ReactElement {
  const envelope = formatCrmProjectAddressEnvelopeLines(address);
  const formattedAddress = formatCrmProjectAddressLine(address);
  const mapsUrl = buildCrmProjectMapsSearchUrl(address);
  const hasAddress = envelope.line1 != null || envelope.line2 != null;
  const valueClass = `${styles.summaryText} ${styles.projectInfoMobileValue}`;

  if (!hasAddress) {
    return <span className={valueClass}>—</span>;
  }

  const content = (
    <>
      {envelope.line1 ? <span className={styles.projectInfoMobileAddressLine}>{envelope.line1}</span> : null}
      {envelope.line2 ? <span className={styles.projectInfoMobileAddressLine}>{envelope.line2}</span> : null}
    </>
  );

  if (formattedAddress != null && mapsUrl != null) {
    return (
      <a
        href={mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`${valueClass} ${styles.summaryLink} ${styles.projectInfoMobileAddressLink}`}
        title={formattedAddress}
      >
        {content}
      </a>
    );
  }

  return (
    <span className={valueClass} title={formattedAddress ?? undefined}>
      {content}
    </span>
  );
}

export function ProjectSummaryAddress({
  address,
  label,
  layout = 'strip',
  editAction,
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
        className={`${styles.summaryText} ${styles.summaryLink}${layout === 'mobile' ? ` ${styles.projectInfoMobileValue}` : ''}`}
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
      <div className={styles.projectInfoMobileAddressSection} role="group" aria-label={label}>
        <span className={styles.projectInfoMobileLabel}>{label}</span>
        <div className={styles.projectInfoMobileAddressValueRow}>
          <div className={styles.projectInfoMobileAddressValue}>
            <MobileAddressValue address={address} />
          </div>
          {editAction ?? null}
        </div>
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
