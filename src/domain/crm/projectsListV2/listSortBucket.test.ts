import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { resolveCrmSubprojectListSortRank } from '../subprojectStatus';
import { computeCrmProjectListSortBucket } from './listSortBucket';
import type { CrmProjectSummary } from '../project';

function summary(
  partial: Pick<CrmProjectSummary, 'subprojectStatus' | 'priority' | 'completedAt'>
): Pick<CrmProjectSummary, 'subprojectStatus' | 'priority' | 'completedAt'> {
  return partial;
}

describe('computeCrmProjectListSortBucket', () => {
  it('matches resolveCrmSubprojectListSortRank (parity)', () => {
    const fixtures = [
      summary({ subprojectStatus: 'urgent', priority: 'normal', completedAt: null }),
      summary({ subprojectStatus: 'normal', priority: 'urgent', completedAt: null }),
      summary({ subprojectStatus: 'normal', priority: 'normal', completedAt: null }),
      summary({ subprojectStatus: 'completed', priority: 'urgent', completedAt: null }),
      summary({
        subprojectStatus: 'normal',
        priority: 'normal',
        completedAt: '2024-01-01T00:00:00.000Z',
      }),
      summary({ subprojectStatus: 'inactive', priority: 'urgent', completedAt: null }),
      summary({
        subprojectStatus: 'inactive',
        priority: 'normal',
        completedAt: '2024-01-01T00:00:00.000Z',
      }),
    ] as const;

    for (const fixture of fixtures) {
      assert.equal(
        computeCrmProjectListSortBucket(fixture),
        resolveCrmSubprojectListSortRank(fixture)
      );
    }
  });

  it('orders urgent < normal < completed < inactive', () => {
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
        subprojectStatus: 'normal',
        priority: 'normal',
        completedAt: null,
      }),
      1
    );
    assert.equal(
      computeCrmProjectListSortBucket({
        subprojectStatus: 'normal',
        priority: 'normal',
        completedAt: '2020-01-01T00:00:00.000Z',
      }),
      2
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
    // Bucket does not use activity; null activity is a cursor/sort concern.
    assert.equal(
      computeCrmProjectListSortBucket({
        subprojectStatus: 'normal',
        priority: 'low',
        completedAt: null,
      }),
      1
    );
  });
});
