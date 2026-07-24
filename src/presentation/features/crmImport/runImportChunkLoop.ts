import { SPREADSHEET_IMPORT_POLL_INTERVAL_MS } from '@/domain/crm/spreadsheetImportLimits';
import type { CrmImportJobCounts } from '@/domain/crm/spreadsheetImportTypes';
import {
  cancelSpreadsheetImportJobFromApi,
  processSpreadsheetImportNextChunkFromApi,
  startSpreadsheetImportExecutionFromApi,
} from '@/infrastructure/crm/api/crmSpreadsheetImportApi';

export type ImportChunkLoopProgress = {
  readonly status: string;
  readonly counts: CrmImportJobCounts;
  readonly processedEntities: number;
  readonly done: boolean;
};

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }
    const timer = setTimeout(() => resolve(), ms);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(new DOMException('Aborted', 'AbortError'));
      },
      { once: true }
    );
  });
}

export async function runImportChunkLoop(opts: {
  readonly jobId: string;
  readonly clientClaimToken: string;
  readonly onProgress: (progress: ImportChunkLoopProgress) => void;
  readonly signal?: AbortSignal;
}): Promise<void> {
  await startSpreadsheetImportExecutionFromApi(opts.jobId, {
    clientClaimToken: opts.clientClaimToken,
  });

  while (true) {
    if (opts.signal?.aborted) {
      try {
        await cancelSpreadsheetImportJobFromApi(opts.jobId);
      } catch {
        // Best-effort cancel when the user aborts locally.
      }
      throw new DOMException('Aborted', 'AbortError');
    }

    const chunk = await processSpreadsheetImportNextChunkFromApi(opts.jobId, {
      clientClaimToken: opts.clientClaimToken,
    });

    opts.onProgress({
      status: chunk.status,
      counts: chunk.counts,
      processedEntities: chunk.processedEntities,
      done: chunk.done,
    });

    if (chunk.done) return;

    await sleep(SPREADSHEET_IMPORT_POLL_INTERVAL_MS, opts.signal);
  }
}
