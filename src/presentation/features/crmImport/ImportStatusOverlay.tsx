'use client';

import { useEffect, useMemo, useState, type ReactElement } from 'react';
import { useGlobalImportStatus } from '@/presentation/features/crmImport/useGlobalImportStatus';
import styles from './ImportStatusOverlay.module.css';

export function ImportStatusOverlay(): ReactElement | null {
  const status = useGlobalImportStatus();
  const [dismissedJobId, setDismissedJobId] = useState<string | null>(null);

  useEffect(() => {
    if (status.jobId == null) {
      setDismissedJobId(null);
    }
  }, [status.jobId]);

  const isDismissed = useMemo(
    () => status.jobId != null && dismissedJobId === status.jobId,
    [dismissedJobId, status.jobId]
  );

  if (status.jobId == null || isDismissed) {
    return null;
  }

  const title = status.done
    ? `${status.percent}%`
    : status.total > 0
      ? `Importing ${status.processed.toLocaleString()} of ${status.total.toLocaleString()}`
      : `Importing ${status.processed.toLocaleString()}`;

  return (
    <section className={styles.overlay} aria-live="polite" aria-label="Spreadsheet import status">
      <div className={styles.header}>
        <p className={styles.title}>{title}</p>
        <button
          type="button"
          className={styles.close}
          onClick={() => setDismissedJobId(status.jobId)}
          aria-label="Dismiss import status"
        >
          <svg
            className={styles.closeIcon}
            viewBox="0 0 16 16"
            width="14"
            height="14"
            aria-hidden="true"
          >
            <path
              d="M3.53 3.53a.75.75 0 0 1 1.06 0L8 6.94l3.41-3.41a.75.75 0 1 1 1.06 1.06L9.06 8l3.41 3.41a.75.75 0 0 1-1.06 1.06L8 9.06l-3.41 3.41a.75.75 0 0 1-1.06-1.06L6.94 8 3.53 4.59a.75.75 0 0 1 0-1.06Z"
              fill="currentColor"
            />
          </svg>
        </button>
      </div>
      <div
        className={styles.progressWrap}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={status.percent}
      >
        <span className={styles.progressFill} style={{ width: `${status.percent}%` }} />
      </div>
      <p className={styles.status}>{status.statusText}</p>
    </section>
  );
}
