import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { EMPTY_CRM_IMPORT_JOB_COUNTS } from '@/domain/crm/spreadsheetImportTypes';
import { mapGlobalImportStatusFromSnapshot } from '@/presentation/features/crmImport/useGlobalImportStatus';

describe('mapGlobalImportStatusFromSnapshot', () => {
  it('returns inactive defaults when there is no active runner', () => {
    const status = mapGlobalImportStatusFromSnapshot(null);
    assert.equal(status.isActive, false);
    assert.equal(status.jobId, null);
    assert.equal(status.percent, 0);
  });

  it('maps active progress with processed/total label data', () => {
    const status = mapGlobalImportStatusFromSnapshot({
      jobId: 'job-1',
      clientClaimToken: 'claim-1',
      totalRows: 29,
      progress: {
        status: 'running',
        counts: EMPTY_CRM_IMPORT_JOB_COUNTS,
        processedEntities: 1,
        done: false,
        cumulativeProcessed: 1,
        lastChunkProcessed: 1,
        peakPercent: 3,
      },
    });
    assert.equal(status.isActive, true);
    assert.equal(status.jobId, 'job-1');
    assert.equal(status.processed, 1);
    assert.equal(status.total, 29);
    assert.equal(status.percent, 3);
    assert.match(status.statusText, /Processing 1 of 29 rows/);
  });

  it('marks settled progress as done so overlay can hide', () => {
    const status = mapGlobalImportStatusFromSnapshot({
      jobId: 'job-2',
      clientClaimToken: 'claim-2',
      totalRows: 10,
      progress: {
        status: 'completed',
        counts: EMPTY_CRM_IMPORT_JOB_COUNTS,
        processedEntities: 0,
        done: true,
        cumulativeProcessed: 10,
        lastChunkProcessed: 0,
        peakPercent: 100,
      },
    });
    assert.equal(status.isActive, false);
    assert.equal(status.done, true);
  });
});
