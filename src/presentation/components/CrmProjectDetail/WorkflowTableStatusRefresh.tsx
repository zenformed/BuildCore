'use client';

import type { ReactElement } from 'react';
import { useCallback, useState } from 'react';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { CloseIcon, RefreshIcon } from '@/platform/icons/buildCoreDashboardShellIcons';
import styles from './ProjectDetail.module.css';

export type WorkflowTableStatusRefreshProps = {
  readonly onRefresh: () => Promise<void>;
  readonly onError?: (message: string) => void;
};

/** Borderless refresh control for the workflow status-icon column header. */
export function WorkflowTableStatusRefresh({
  onRefresh,
  onError,
}: WorkflowTableStatusRefreshProps): ReactElement {
  const copy = content.projectDetail.actions;
  const sectionLabel = content.projectDetail.sections.workflow;
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await onRefresh();
    } catch {
      onError?.(copy.refreshFailed);
    } finally {
      setRefreshing(false);
    }
  }, [copy.refreshFailed, onError, onRefresh]);

  return (
    <button
      type="button"
      className={[
        styles.workflowStatusIconRefreshBtn,
        refreshing ? styles.workflowStatusIconRefreshBtn_busy : '',
      ]
        .filter(Boolean)
        .join(' ')}
      title={refreshing ? copy.refreshingSection : copy.refreshSection}
      aria-label={
        refreshing
          ? copy.refreshingSectionAria(sectionLabel)
          : copy.refreshSectionAria(sectionLabel)
      }
      aria-busy={refreshing || undefined}
      disabled={refreshing}
      onClick={() => void handleRefresh()}
    >
      {refreshing ? (
        <CloseIcon className={styles.workflowStatusIconRefreshGlyph} />
      ) : (
        <RefreshIcon className={styles.workflowStatusIconRefreshGlyph} />
      )}
    </button>
  );
}
