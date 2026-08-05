/**
 * Module-level owner for the client-driven import chunk loop.
 * Survives SpreadsheetImportModal close/unmount so Close is safe
 * (does not cancel) while Cancel still aborts the runner.
 */

import { EMPTY_CRM_IMPORT_JOB_COUNTS } from '@/domain/crm/spreadsheetImportTypes';
import {
  runImportChunkLoop,
  type ImportChunkLoopProgress,
} from '@/presentation/features/crmImport/runImportChunkLoop';

export type ImportRunnerProgress = ImportChunkLoopProgress & {
  readonly cumulativeProcessed: number;
  readonly lastChunkProcessed: number;
  readonly peakPercent: number;
};

export type ImportRunnerListener = (progress: ImportRunnerProgress) => void;
export type ActiveImportRunnerSnapshot = {
  readonly jobId: string;
  readonly clientClaimToken: string;
  readonly totalRows: number;
  readonly progress: ImportRunnerProgress;
};
export type ActiveImportRunnerListener = (snapshot: ActiveImportRunnerSnapshot | null) => void;

type ChunkLoopFn = typeof runImportChunkLoop;

type ActiveImportRunner = {
  readonly jobId: string;
  readonly clientClaimToken: string;
  readonly totalRows: number;
  readonly abort: AbortController;
  readonly listeners: Set<ImportRunnerListener>;
  promise: Promise<void>;
  last: ImportRunnerProgress;
  settled: boolean;
  error: Error | null;
};

type ImportChunkRunnerStore = {
  activeRunner: ActiveImportRunner | null;
  chunkLoopImpl: ChunkLoopFn;
  activeRunnerListeners: Set<ActiveImportRunnerListener>;
};

const STORE_KEY = '__buildcoreImportChunkRunnerStore__';

function getStore(): ImportChunkRunnerStore {
  const globalStore = globalThis as typeof globalThis & {
    [STORE_KEY]?: ImportChunkRunnerStore;
  };
  if (globalStore[STORE_KEY] == null) {
    globalStore[STORE_KEY] = {
      activeRunner: null,
      chunkLoopImpl: runImportChunkLoop,
      activeRunnerListeners: new Set<ActiveImportRunnerListener>(),
    };
  }
  return globalStore[STORE_KEY]!;
}

function emptyProgress(): ImportRunnerProgress {
  return {
    status: 'running',
    counts: EMPTY_CRM_IMPORT_JOB_COUNTS,
    processedEntities: 0,
    done: false,
    cumulativeProcessed: 0,
    lastChunkProcessed: 0,
    peakPercent: 0,
  };
}

export function getActiveImportRunnerJobId(): string | null {
  const { activeRunner } = getStore();
  return activeRunner && !activeRunner.settled ? activeRunner.jobId : null;
}

export function getActiveImportRunnerSnapshot(): ActiveImportRunnerSnapshot | null {
  const { activeRunner } = getStore();
  if (activeRunner == null || activeRunner.settled) return null;
  return {
    jobId: activeRunner.jobId,
    clientClaimToken: activeRunner.clientClaimToken,
    totalRows: activeRunner.totalRows,
    progress: activeRunner.last,
  };
}

export function subscribeActiveImportRunner(listener: ActiveImportRunnerListener): () => void {
  const store = getStore();
  const { activeRunnerListeners } = store;
  activeRunnerListeners.add(listener);
  listener(getActiveImportRunnerSnapshot());
  return () => {
    activeRunnerListeners.delete(listener);
  };
}

export function isImportChunkRunnerActive(jobId?: string | null): boolean {
  const { activeRunner } = getStore();
  if (activeRunner == null || activeRunner.settled) return false;
  if (jobId == null || jobId === '') return true;
  return activeRunner.jobId === jobId;
}

export function peekImportChunkRunner(jobId: string): ImportRunnerProgress | null {
  const { activeRunner } = getStore();
  if (activeRunner == null || activeRunner.jobId !== jobId) return null;
  return activeRunner.last;
}

export function subscribeImportChunkRunner(
  jobId: string,
  listener: ImportRunnerListener
): () => void {
  const { activeRunner } = getStore();
  if (activeRunner == null || activeRunner.jobId !== jobId) {
    return () => undefined;
  }
  activeRunner.listeners.add(listener);
  listener(activeRunner.last);
  return () => {
    activeRunner?.listeners.delete(listener);
  };
}

function publish(runner: ActiveImportRunner, progress: ImportRunnerProgress): void {
  const { activeRunnerListeners } = getStore();
  runner.last = progress;
  for (const listener of runner.listeners) {
    try {
      listener(progress);
    } catch {
      // Ignore listener failures so global observers still receive updates.
    }
  }
  const snapshot = getActiveImportRunnerSnapshot();
  for (const listener of activeRunnerListeners) {
    try {
      listener(snapshot);
    } catch {
      // Ignore listener failures so one consumer cannot block others.
    }
  }
}

/**
 * Start a chunk loop for `jobId`, or attach to the existing runner if it is
 * already active for the same job. Never starts a second loop for one job.
 */
export function startOrAttachImportChunkRunner(input: {
  readonly jobId: string;
  readonly clientClaimToken: string;
  readonly totalRows: number;
  readonly listener?: ImportRunnerListener;
}): {
  readonly attached: boolean;
  readonly promise: Promise<void>;
} {
  const store = getStore();
  const { activeRunner } = store;
  if (activeRunner != null && !activeRunner.settled) {
    if (activeRunner.jobId !== input.jobId) {
      throw new Error('Another spreadsheet import is already running.');
    }
    if (input.listener) {
      activeRunner.listeners.add(input.listener);
      input.listener(activeRunner.last);
    }
    return { attached: true, promise: activeRunner.promise };
  }

  const abort = new AbortController();
  const listeners = new Set<ImportRunnerListener>();
  if (input.listener) listeners.add(input.listener);

  const runner: ActiveImportRunner = {
    jobId: input.jobId,
    clientClaimToken: input.clientClaimToken,
    totalRows: Math.max(0, input.totalRows),
    abort,
    listeners,
    promise: Promise.resolve(),
    last: emptyProgress(),
    settled: false,
    error: null,
  };

  store.activeRunner = runner;
  publish(runner, emptyProgress());

  const promise = store.chunkLoopImpl({
    jobId: input.jobId,
    clientClaimToken: input.clientClaimToken,
    signal: abort.signal,
    onProgress: (chunk) => {
      const cumulativeProcessed = runner.last.cumulativeProcessed + chunk.processedEntities;
      const rawPercent =
        runner.totalRows > 0
          ? Math.floor((cumulativeProcessed / runner.totalRows) * 100)
          : runner.last.peakPercent;
      const capped =
        chunk.done && chunk.status === 'completed'
          ? 100
          : chunk.status === 'failed' || chunk.status === 'cancelled'
            ? Math.min(100, Math.max(rawPercent, runner.last.peakPercent))
            : Math.min(99, Math.max(0, rawPercent));
      const peakPercent = Math.max(runner.last.peakPercent, capped);
      publish(runner, {
        ...chunk,
        cumulativeProcessed,
        lastChunkProcessed: chunk.processedEntities,
        peakPercent,
      });
    },
  })
    .catch((err) => {
      runner.error = err instanceof Error ? err : new Error(String(err));
      throw err;
    })
    .finally(() => {
      runner.settled = true;
      const currentStore = getStore();
      if (currentStore.activeRunner === runner) {
        currentStore.activeRunner = null;
      }
      const snapshot = getActiveImportRunnerSnapshot();
      for (const listener of currentStore.activeRunnerListeners) {
        try {
          listener(snapshot);
        } catch {
          // Ignore listener failures during settle broadcast.
        }
      }
    });

  runner.promise = promise;

  return { attached: false, promise };
}

/** Abort the active runner (triggers cancel API inside the chunk loop). */
export async function cancelImportChunkRunner(jobId: string): Promise<void> {
  const { activeRunner } = getStore();
  if (activeRunner == null || activeRunner.jobId !== jobId) return;
  const runner = activeRunner;
  if (!runner.abort.signal.aborted) {
    runner.abort.abort();
  }
  try {
    await runner.promise;
  } catch {
    // AbortError expected
  }
}

/** Test helpers */
export function __resetImportChunkRunnerForTests(): void {
  const store = getStore();
  const { activeRunner, activeRunnerListeners } = store;
  if (activeRunner != null && !activeRunner.abort.signal.aborted) {
    activeRunner.abort.abort();
  }
  store.activeRunner = null;
  store.chunkLoopImpl = runImportChunkLoop;
  for (const listener of activeRunnerListeners) {
    listener(null);
  }
  activeRunnerListeners.clear();
}

export function __setImportChunkLoopForTests(impl: ChunkLoopFn): void {
  getStore().chunkLoopImpl = impl;
}
