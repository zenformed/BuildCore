import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildImportProgressStatusLine,
  computeImportProgressPercent,
  failedRowsDisplayCount,
  isImportExecutionSettled,
  isImportExecutionSuccessful,
  resolveImportExecutionPhase,
  resolveImportTimeline,
  shouldConfirmCancelImport,
} from '@/presentation/features/crmImport/interview/importPresentation';
import { EMPTY_CRM_IMPORT_JOB_COUNTS } from '@/domain/crm/spreadsheetImportTypes';

describe('importPresentation', () => {
  it('maps job status to execution phase', () => {
    assert.equal(resolveImportExecutionPhase('running'), 'running');
    assert.equal(resolveImportExecutionPhase('completed'), 'completed');
    assert.equal(resolveImportExecutionPhase('partially_completed'), 'paused');
    assert.equal(resolveImportExecutionPhase('failed'), 'failed');
    assert.equal(resolveImportExecutionPhase('cancelled'), 'cancelled');
  });

  it('caps running progress below 100 and reaches 100 only when completed', () => {
    const mid = computeImportProgressPercent({
      status: 'running',
      cumulativeProcessed: 1500,
      totalRows: 2856,
      previousPeak: 0,
    });
    assert.equal(mid.percent, 52);
    assert.ok(mid.percent < 100);

    const almost = computeImportProgressPercent({
      status: 'running',
      cumulativeProcessed: 2856,
      totalRows: 2856,
      previousPeak: mid.peak,
    });
    assert.equal(almost.percent, 99);

    const done = computeImportProgressPercent({
      status: 'completed',
      cumulativeProcessed: 2856,
      totalRows: 2856,
      previousPeak: almost.peak,
      done: true,
    });
    assert.equal(done.percent, 100);
  });

  it('never moves progress backward', () => {
    const next = computeImportProgressPercent({
      status: 'running',
      cumulativeProcessed: 10,
      totalRows: 100,
      previousPeak: 40,
    });
    assert.equal(next.percent, 40);
  });

  it('builds concise row-range and small-import status copy', () => {
    assert.match(
      buildImportProgressStatusLine({
        cumulativeProcessed: 1500,
        lastChunkProcessed: 500,
        totalRows: 2856,
        phase: 'running',
      }),
      /Processing rows 1,001–1,500 of 2,856/
    );
    assert.equal(
      buildImportProgressStatusLine({
        cumulativeProcessed: 18,
        lastChunkProcessed: 18,
        totalRows: 29,
        phase: 'running',
      }),
      'Processing 18 of 29 rows'
    );
  });

  it('drives timeline stages from job state, not a timer', () => {
    const running = resolveImportTimeline({
      status: 'running',
      cumulativeProcessed: 100,
      totalRows: 1000,
      percent: 10,
    });
    assert.equal(running.find((s) => s.id === 'reading')?.status, 'completed');
    assert.equal(running.find((s) => s.id === 'validating')?.status, 'completed');
    assert.equal(running.find((s) => s.id === 'creating')?.status, 'in_progress');
    assert.equal(running.find((s) => s.id === 'finalizing')?.status, 'pending');
    assert.equal(running.find((s) => s.id === 'preparing')?.status, 'pending');

    const wrapping = resolveImportTimeline({
      status: 'running',
      cumulativeProcessed: 1000,
      totalRows: 1000,
      percent: 99,
    });
    assert.equal(wrapping.find((s) => s.id === 'creating')?.status, 'completed');
    assert.equal(wrapping.find((s) => s.id === 'finalizing')?.status, 'in_progress');

    const completed = resolveImportTimeline({
      status: 'completed',
      cumulativeProcessed: 1000,
      totalRows: 1000,
      percent: 100,
      done: true,
    });
    assert.ok(completed.every((s) => s.status === 'completed'));
  });

  it('requires cancel confirmation after partial success', () => {
    assert.equal(shouldConfirmCancelImport(EMPTY_CRM_IMPORT_JOB_COUNTS), false);
    assert.equal(
      shouldConfirmCancelImport({ ...EMPTY_CRM_IMPORT_JOB_COUNTS, createdSubprojects: 2 }),
      true
    );
  });

  it('combines failed and invalid rows for the failed metric', () => {
    assert.equal(
      failedRowsDisplayCount({
        ...EMPTY_CRM_IMPORT_JOB_COUNTS,
        failedRows: 2,
        invalidRows: 3,
      }),
      5
    );
  });

  it('treats completed and partial jobs as settled on the Import screen', () => {
    assert.equal(isImportExecutionSettled('running'), false);
    assert.equal(isImportExecutionSettled('completed'), true);
    assert.equal(isImportExecutionSuccessful('completed'), true);
    assert.equal(isImportExecutionSuccessful('partially_completed'), true);
    assert.equal(isImportExecutionSuccessful('failed'), false);
  });
});
