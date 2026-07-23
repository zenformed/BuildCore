'use client';

import type { ReactElement } from 'react';
import type { CrmDirectUploadFileProgress } from '@/presentation/features/crmDirectUpload/performBuildCoreDirectUpload';
import styles from './CrmDirectUploadQueue.module.css';

export type CrmDirectUploadQueueProps = {
  readonly items: readonly CrmDirectUploadFileProgress[];
  readonly running: boolean;
  readonly onRetryFailed?: () => void;
  readonly onDismiss?: () => void;
  readonly retryLabel?: string;
  readonly dismissLabel?: string;
};

export function CrmDirectUploadQueue({
  items,
  running,
  onRetryFailed,
  onDismiss,
  retryLabel = 'Retry failed',
  dismissLabel = 'Dismiss',
}: CrmDirectUploadQueueProps): ReactElement | null {
  if (items.length === 0) return null;

  const remaining = items.filter(
    (item) => item.status === 'waiting' || item.status === 'uploading'
  ).length;
  const failedCount = items.filter((item) => item.status === 'failed').length;
  const succeededCount = items.filter((item) => item.status === 'complete').length;
  const canRetry = !running && failedCount > 0 && onRetryFailed != null;
  const canDismiss = !running && onDismiss != null;

  let summary: string;
  if (running || remaining > 0) {
    summary = `${remaining}/${items.length} remaining`;
  } else if (failedCount > 0) {
    summary =
      succeededCount > 0
        ? `${succeededCount} uploaded · ${failedCount} failed`
        : `${failedCount} failed`;
  } else {
    summary = `${succeededCount} uploaded`;
  }

  return (
    <div className={styles.queue} role="status" aria-live="polite">
      <span className={styles.summary}>{summary}</span>
      <div className={styles.actions}>
        {canRetry ? (
          <button type="button" className={styles.actionButton} onClick={onRetryFailed}>
            {retryLabel}
          </button>
        ) : null}
        {canDismiss ? (
          <button type="button" className={styles.actionButton} onClick={onDismiss}>
            {dismissLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}
