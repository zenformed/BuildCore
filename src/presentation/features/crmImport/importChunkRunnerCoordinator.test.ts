import assert from 'node:assert/strict';
import { describe, it, beforeEach, afterEach } from 'node:test';
import {
  __resetImportChunkRunnerForTests,
  __setImportChunkLoopForTests,
  cancelImportChunkRunner,
  getActiveImportRunnerSnapshot,
  getActiveImportRunnerJobId,
  isImportChunkRunnerActive,
  subscribeActiveImportRunner,
  startOrAttachImportChunkRunner,
} from '@/presentation/features/crmImport/importChunkRunnerCoordinator';
import { EMPTY_CRM_IMPORT_JOB_COUNTS } from '@/domain/crm/spreadsheetImportTypes';

describe('importChunkRunnerCoordinator', () => {
  beforeEach(() => {
    __resetImportChunkRunnerForTests();
  });

  afterEach(() => {
    __resetImportChunkRunnerForTests();
  });

  it('starts one runner and attaches subsequent callers to the same job', async () => {
    __setImportChunkLoopForTests(async ({ onProgress }) => {
      onProgress({
        status: 'completed',
        counts: { ...EMPTY_CRM_IMPORT_JOB_COUNTS, createdSubprojects: 2 },
        processedEntities: 2,
        done: true,
      });
    });

    const first = startOrAttachImportChunkRunner({
      jobId: 'job-1',
      clientClaimToken: 'claim-a',
      totalRows: 2,
    });
    assert.equal(first.attached, false);
    assert.equal(isImportChunkRunnerActive('job-1'), true);
    assert.equal(getActiveImportRunnerJobId(), 'job-1');

    const second = startOrAttachImportChunkRunner({
      jobId: 'job-1',
      clientClaimToken: 'claim-a',
      totalRows: 2,
    });
    assert.equal(second.attached, true);
    assert.equal(second.promise, first.promise);

    await first.promise;
    assert.equal(isImportChunkRunnerActive('job-1'), false);
  });

  it('refuses a second concurrent job', () => {
    __setImportChunkLoopForTests(
      () =>
        new Promise(() => {
          /* hang until abort/reset */
        })
    );
    startOrAttachImportChunkRunner({
      jobId: 'job-1',
      clientClaimToken: 'claim-a',
      totalRows: 10,
    });
    assert.throws(
      () =>
        startOrAttachImportChunkRunner({
          jobId: 'job-2',
          clientClaimToken: 'claim-b',
          totalRows: 10,
        }),
      /already running/i
    );
  });

  it('cancel aborts the active runner', async () => {
    let sawAbort = false;
    __setImportChunkLoopForTests(async ({ signal }) => {
      await new Promise<void>((resolve, reject) => {
        if (signal?.aborted) {
          reject(new DOMException('Aborted', 'AbortError'));
          return;
        }
        signal?.addEventListener(
          'abort',
          () => {
            sawAbort = true;
            reject(new DOMException('Aborted', 'AbortError'));
          },
          { once: true }
        );
      });
    });

    const started = startOrAttachImportChunkRunner({
      jobId: 'job-cancel',
      clientClaimToken: 'claim-c',
      totalRows: 100,
    });
    await cancelImportChunkRunner('job-cancel');
    assert.equal(sawAbort, true);
    try {
      await started.promise;
      assert.fail('expected AbortError');
    } catch (err) {
      assert.ok(err instanceof DOMException && err.name === 'AbortError');
    }
    assert.equal(isImportChunkRunnerActive('job-cancel'), false);
  });

  it('listener receives cumulative progress for an active job', async () => {
    const updates: number[] = [];
    __setImportChunkLoopForTests(async ({ onProgress }) => {
      onProgress({
        status: 'running',
        counts: { ...EMPTY_CRM_IMPORT_JOB_COUNTS, createdSubprojects: 1 },
        processedEntities: 1,
        done: false,
      });
      await Promise.resolve();
      onProgress({
        status: 'completed',
        counts: { ...EMPTY_CRM_IMPORT_JOB_COUNTS, createdSubprojects: 2 },
        processedEntities: 1,
        done: true,
      });
    });

    const started = startOrAttachImportChunkRunner({
      jobId: 'job-sub',
      clientClaimToken: 'claim-s',
      totalRows: 2,
      listener: (progress) => {
        updates.push(progress.cumulativeProcessed);
      },
    });
    await started.promise;
    assert.ok(updates.includes(2));
  });

  it('publishes active runner snapshot changes for global observers', async () => {
    const snapshots: Array<string | null> = [];
    const unsubscribe = subscribeActiveImportRunner((snapshot) => {
      snapshots.push(snapshot?.jobId ?? null);
    });

    __setImportChunkLoopForTests(async ({ onProgress }) => {
      onProgress({
        status: 'completed',
        counts: EMPTY_CRM_IMPORT_JOB_COUNTS,
        processedEntities: 1,
        done: true,
      });
    });

    const started = startOrAttachImportChunkRunner({
      jobId: 'job-global',
      clientClaimToken: 'claim-global',
      totalRows: 1,
    });

    assert.equal(getActiveImportRunnerSnapshot()?.jobId, 'job-global');
    await started.promise;
    assert.equal(getActiveImportRunnerSnapshot(), null);
    unsubscribe();

    assert.deepEqual(snapshots, [null, 'job-global', 'job-global', null]);
  });
});
