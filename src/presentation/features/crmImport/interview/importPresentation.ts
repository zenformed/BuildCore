/**
 * Pure helpers for the active spreadsheet Import execution screen.
 */

import type { CrmImportJobCounts } from '@/domain/crm/spreadsheetImportTypes';

export type ImportExecutionPhase =
  | 'running'
  | 'paused'
  | 'failed'
  | 'cancelled'
  | 'completed';

export type ImportTimelineStageId =
  | 'reading'
  | 'validating'
  | 'creating'
  | 'finalizing'
  | 'preparing';

export type ImportTimelineStageStatus = 'completed' | 'in_progress' | 'pending' | 'failed';

export type ImportTimelineStage = {
  readonly id: ImportTimelineStageId;
  readonly status: ImportTimelineStageStatus;
};

export function resolveImportExecutionPhase(status: string): ImportExecutionPhase {
  switch (status) {
    case 'completed':
      return 'completed';
    case 'partially_completed':
      return 'paused';
    case 'failed':
      return 'failed';
    case 'cancelled':
      return 'cancelled';
    default:
      return 'running';
  }
}

/**
 * Progress percent from cumulative processed rows.
 * Never moves backward (peak). Caps below 100 until job completion is confirmed.
 */
export function computeImportProgressPercent(input: {
  readonly status: string;
  readonly cumulativeProcessed: number;
  readonly totalRows: number;
  readonly previousPeak: number;
  readonly done?: boolean;
}): { readonly percent: number; readonly peak: number } {
  const previousPeak = Math.max(0, Math.min(100, input.previousPeak));
  const phase = resolveImportExecutionPhase(input.status);

  if (phase === 'completed' || (input.done === true && input.status === 'completed')) {
    return { percent: 100, peak: 100 };
  }

  let raw = 0;
  if (input.totalRows > 0) {
    raw = Math.floor((Math.max(0, input.cumulativeProcessed) / input.totalRows) * 100);
  } else if (input.cumulativeProcessed > 0) {
    raw = Math.min(99, previousPeak > 0 ? previousPeak : 5);
  }

  if (phase === 'failed' || phase === 'cancelled') {
    const percent = Math.max(previousPeak, Math.min(100, raw));
    return { percent, peak: percent };
  }

  if (phase === 'paused') {
    const allDone =
      input.totalRows > 0 && input.cumulativeProcessed >= input.totalRows;
    const capped = allDone ? 100 : Math.min(99, raw);
    const percent = Math.max(previousPeak, capped);
    return { percent, peak: percent };
  }

  const capped = Math.min(99, Math.max(0, raw));
  const percent = Math.max(previousPeak, capped);
  return { percent, peak: percent };
}

export function buildImportProgressStatusLine(input: {
  readonly cumulativeProcessed: number;
  readonly lastChunkProcessed: number;
  readonly totalRows: number;
  readonly phase: ImportExecutionPhase;
}): string {
  const total = Math.max(0, input.totalRows);
  const processed = Math.max(0, Math.min(input.cumulativeProcessed, total || input.cumulativeProcessed));

  if (input.phase === 'completed') {
    return total > 0
      ? `Processed ${total.toLocaleString()} of ${total.toLocaleString()} rows`
      : 'Import finished';
  }
  if (input.phase === 'cancelled') {
    return 'Import cancelled';
  }
  if (input.phase === 'failed') {
    return 'Import needs attention';
  }
  if (input.phase === 'paused') {
    return total > 0
      ? `Paused after ${processed.toLocaleString()} of ${total.toLocaleString()} rows`
      : 'Import paused';
  }

  if (total <= 0) {
    return processed > 0
      ? `Processing ${processed.toLocaleString()} rows`
      : 'Preparing to process rows';
  }

  if (total <= 50 || input.lastChunkProcessed <= 0) {
    return `Processing ${processed.toLocaleString()} of ${total.toLocaleString()} rows`;
  }

  const rangeEnd = Math.max(1, processed);
  const rangeStart = Math.max(1, rangeEnd - Math.max(1, input.lastChunkProcessed) + 1);
  return `Processing rows ${rangeStart.toLocaleString()}–${rangeEnd.toLocaleString()} of ${total.toLocaleString()}`;
}

export function resolveImportTimeline(input: {
  readonly status: string;
  readonly cumulativeProcessed: number;
  readonly totalRows: number;
  readonly percent: number;
  readonly done?: boolean;
}): readonly ImportTimelineStage[] {
  const phase = resolveImportExecutionPhase(input.status);
  const rowsDone =
    input.totalRows > 0
      ? input.cumulativeProcessed >= input.totalRows
      : input.percent >= 99 || input.done === true;

  const reading: ImportTimelineStageStatus = 'completed';
  const validating: ImportTimelineStageStatus = 'completed';

  let creating: ImportTimelineStageStatus = 'pending';
  let finalizing: ImportTimelineStageStatus = 'pending';
  let preparing: ImportTimelineStageStatus = 'pending';

  if (phase === 'failed') {
    creating = rowsDone ? 'completed' : 'failed';
    finalizing = rowsDone ? 'failed' : 'pending';
  } else if (phase === 'cancelled') {
    creating = 'completed';
    finalizing = 'pending';
    preparing = 'pending';
  } else if (phase === 'completed') {
    creating = 'completed';
    finalizing = 'completed';
    preparing = 'completed';
  } else if (phase === 'paused') {
    creating = 'completed';
    finalizing = 'completed';
    preparing = 'completed';
  } else if (rowsDone) {
    creating = 'completed';
    finalizing = 'in_progress';
    preparing = 'pending';
  } else {
    creating = 'in_progress';
    finalizing = 'pending';
    preparing = 'pending';
  }

  return [
    { id: 'reading', status: reading },
    { id: 'validating', status: validating },
    { id: 'creating', status: creating },
    { id: 'finalizing', status: finalizing },
    { id: 'preparing', status: preparing },
  ];
}

export function importTimelineStatusLabel(
  status: ImportTimelineStageStatus
): string {
  switch (status) {
    case 'completed':
      return 'Completed';
    case 'in_progress':
      return 'In progress';
    case 'failed':
      return 'Failed';
    default:
      return 'Pending';
  }
}

export function shouldConfirmCancelImport(counts: CrmImportJobCounts): boolean {
  return counts.createdSubprojects > 0 || counts.createdParents > 0;
}

export function failedRowsDisplayCount(counts: CrmImportJobCounts): number {
  return counts.failedRows + counts.invalidRows;
}

/** Terminal job statuses shown on the Import screen (no separate Results screen). */
export function isImportExecutionSettled(status: string): boolean {
  return (
    status === 'completed' ||
    status === 'partially_completed' ||
    status === 'failed' ||
    status === 'cancelled'
  );
}

export function isImportExecutionSuccessful(status: string): boolean {
  return status === 'completed' || status === 'partially_completed';
}
