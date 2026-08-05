'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  getActiveImportRunnerSnapshot,
  subscribeActiveImportRunner,
  type ActiveImportRunnerSnapshot,
} from '@/presentation/features/crmImport/importChunkRunnerCoordinator';
import {
  buildImportProgressStatusLine,
  resolveImportExecutionPhase,
} from '@/presentation/features/crmImport/interview/importPresentation';

export type GlobalImportStatus = {
  readonly isActive: boolean;
  readonly jobId: string | null;
  readonly processed: number;
  readonly total: number;
  readonly percent: number;
  readonly statusText: string;
  readonly done: boolean;
};

export function mapGlobalImportStatusFromSnapshot(
  snapshot: ActiveImportRunnerSnapshot | null
): GlobalImportStatus {
  if (snapshot == null) {
    return {
      isActive: false,
      jobId: null,
      processed: 0,
      total: 0,
      percent: 0,
      statusText: '',
      done: false,
    };
  }

  const total = Math.max(0, snapshot.totalRows);
  const processed = Math.max(
    0,
    total > 0
      ? Math.min(total, snapshot.progress.cumulativeProcessed)
      : snapshot.progress.cumulativeProcessed
  );
  const percent = Math.max(0, Math.min(100, snapshot.progress.peakPercent));
  const phase = resolveImportExecutionPhase(snapshot.progress.status);
  const statusText = buildImportProgressStatusLine({
    cumulativeProcessed: processed,
    lastChunkProcessed: snapshot.progress.lastChunkProcessed,
    totalRows: total,
    phase,
  });

  return {
    isActive: !snapshot.progress.done,
    jobId: snapshot.jobId,
    processed,
    total,
    percent,
    statusText,
    done: snapshot.progress.done,
  };
}

export function useGlobalImportStatus(): GlobalImportStatus {
  const [snapshot, setSnapshot] = useState<ActiveImportRunnerSnapshot | null>(() =>
    getActiveImportRunnerSnapshot()
  );
  const [settledSnapshot, setSettledSnapshot] = useState<ActiveImportRunnerSnapshot | null>(null);

  useEffect(() => {
    return subscribeActiveImportRunner((nextSnapshot) => {
      setSnapshot(nextSnapshot);
      if (nextSnapshot == null) return;
      if (nextSnapshot.progress.done) {
        setSettledSnapshot(nextSnapshot);
        return;
      }
      setSettledSnapshot(null);
    });
  }, []);

  useEffect(() => {
    // Fallback synchronization: if a listener misses an event (e.g. close timing),
    // keep the root status aligned with the current runner snapshot.
    const timer = window.setInterval(() => {
      setSnapshot(getActiveImportRunnerSnapshot());
    }, 250);
    return () => window.clearInterval(timer);
  }, []);

  const visibleSnapshot = snapshot ?? settledSnapshot;
  return useMemo(() => mapGlobalImportStatusFromSnapshot(visibleSnapshot), [visibleSnapshot]);
}
