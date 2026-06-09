'use client';

import type { ReactElement } from 'react';
import { useCallback, useState } from 'react';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { DetailPanelHeaderButton } from './DetailPanelHeaderButton';

export type DetailPanelSectionRefreshProps = {
  readonly sectionLabel: string;
  readonly onRefresh: () => Promise<void>;
  readonly onError?: (message: string) => void;
};

export function DetailPanelSectionRefresh({
  sectionLabel,
  onRefresh,
  onError,
}: DetailPanelSectionRefreshProps): ReactElement {
  const copy = content.projectDetail.actions;
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
    <DetailPanelHeaderButton
      variant="refresh"
      refreshing={refreshing}
      title={refreshing ? copy.refreshingSection : copy.refreshSection}
      aria-label={
        refreshing
          ? copy.refreshingSectionAria(sectionLabel)
          : copy.refreshSectionAria(sectionLabel)
      }
      onClick={() => void handleRefresh()}
    />
  );
}
