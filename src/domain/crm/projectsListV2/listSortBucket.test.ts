import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { resolveCrmProjectListSortRank } from '../projectStatus';
import { computeCrmProjectListSortBucket } from './listSortBucket';
import type { CrmProjectSummary } from '../project';

function summary(
  partial: Pick<CrmProjectSummary, 'status' | 'priority' | 'completedAt'>
): Pick<CrmProjectSummary, 'status' | 'priority' | 'completedAt'> {
  return partial;
}

describe('computeCrmProjectListSortBucket', () => {
  it('matches resolveCrmProjectListSortRank (parity)', () => {
    const fixtures = [
      summary({ status: 'active', priority: 'urgent', completedAt: null }),
      summary({ status: 'active', priority: 'normal', completedAt: null }),
      summary({ status: 'completed', priority: 'urgent', completedAt: null }),
      summary({
        status: 'active',
        priority: 'normal',
        completedAt: '2024-01-01T00:00:00.000Z',
      }),
      summary({ status: 'lost', priority: 'urgent', completedAt: null }),
      summary({
        status: 'cancelled',
        priority: 'normal',
        completedAt: '2024-01-01T00:00:00.000Z',
      }),
    ] as const;

    for (const fixture of fixtures) {
      assert.equal(
        computeCrmProjectListSortBucket(fixture),
        resolveCrmProjectListSortRank(fixture)
      );
    }
  });

  it('orders urgent < normal < completed < lost/cancelled', () => {
    assert.equal(
      computeCrmProjectListSortBucket({
        status: 'active',
        priority: 'urgent',
        completedAt: null,
      }),
      0
    );
    assert.equal(
      computeCrmProjectListSortBucket({
        status: 'active',
        priority: 'normal',
        completedAt: null,
      }),
      1
    );
    assert.equal(
      computeCrmProjectListSortBucket({
        status: 'active',
        priority: 'normal',
        completedAt: '2020-01-01T00:00:00.000Z',
      }),
      2
    );
    assert.equal(
      computeCrmProjectListSortBucket({
        status: 'lost',
        priority: 'normal',
        completedAt: null,
      }),
      3
    );
  });

  it('keeps legacy subprojectStatus dual-read parity with SQL', () => {
    assert.equal(
      computeCrmProjectListSortBucket({
        subprojectStatus: 'urgent',
        priority: 'normal',
        completedAt: null,
      }),
      0
    );
    assert.equal(
      computeCrmProjectListSortBucket({
        subprojectStatus: 'inactive',
        priority: 'normal',
        completedAt: null,
      }),
      3
    );
  });

  it('treats null last_activity_at as allowed (bucket independent)', () => {
    assert.equal(
      computeCrmProjectListSortBucket({
        status: 'active',
        priority: 'low',
        completedAt: null,
      }),
      1
    );
  });
});
