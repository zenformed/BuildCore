import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  resolveCrmProjectsListV2PageFlags,
  sliceOperationalKeysetPage,
  type CrmProjectsListV2KeysetValues,
} from './projectsListV2Keyset';

function row(
  id: string,
  bucket: number,
  lastActivityAt: string | null
): CrmProjectsListV2KeysetValues {
  return { id, listSortBucket: bucket, lastActivityAt };
}

describe('projectsListV2Keyset', () => {
  const dataset = [
    row('a', 0, '2026-01-05T00:00:00.000Z'),
    row('b', 0, '2026-01-05T00:00:00.000Z'), // duplicate activity
    row('c', 0, '2026-01-04T00:00:00.000Z'),
    row('d', 1, '2026-01-10T00:00:00.000Z'),
    row('e', 1, null),
    row('f', 1, null),
    row('g', 2, '2026-01-01T00:00:00.000Z'),
    row('h', 3, null),
  ].sort((left, right) => {
    if (left.listSortBucket !== right.listSortBucket) {
      return left.listSortBucket - right.listSortBucket;
    }
    if (left.lastActivityAt == null && right.lastActivityAt == null) {
      return right.id.localeCompare(left.id);
    }
    if (left.lastActivityAt == null) return 1;
    if (right.lastActivityAt == null) return -1;
    if (left.lastActivityAt !== right.lastActivityAt) {
      return right.lastActivityAt.localeCompare(left.lastActivityAt);
    }
    return right.id.localeCompare(left.id);
  });

  it('resolves first-page flags', () => {
    assert.deepEqual(
      resolveCrmProjectsListV2PageFlags({
        direction: 'forward',
        hasIncomingCursor: false,
        fetchedCount: 51,
        limit: 50,
      }),
      { hasNextPage: true, hasPreviousPage: false, pageRowCount: 50, hasExtra: true }
    );
  });

  it('traverses forward/backward without duplicates across fixed dataset', () => {
    const limit = 3;
    const seen = new Set<string>();
    let cursor: CrmProjectsListV2KeysetValues | null = null;
    let pageCount = 0;
    let hasNext = true;

    while (hasNext) {
      const pageResult: ReturnType<typeof sliceOperationalKeysetPage<CrmProjectsListV2KeysetValues>> =
        sliceOperationalKeysetPage({
          sortedRows: dataset,
          limit,
          direction: 'forward',
          cursor,
        });
      pageCount += 1;
      for (const item of pageResult.page) {
        assert.equal(seen.has(item.id), false, `duplicate ${item.id}`);
        seen.add(item.id);
      }
      hasNext = pageResult.hasNextPage;
      if (hasNext) {
        const last: CrmProjectsListV2KeysetValues | undefined =
          pageResult.page[pageResult.page.length - 1];
        assert.ok(last);
        cursor = last;
      }
    }

    assert.equal(seen.size, dataset.length);
    assert.ok(pageCount >= 2);

    // Previous from second page returns to first page head
    const first = sliceOperationalKeysetPage({
      sortedRows: dataset,
      limit,
      direction: 'forward',
      cursor: null,
    });
    const second = sliceOperationalKeysetPage({
      sortedRows: dataset,
      limit,
      direction: 'forward',
      cursor: first.page[first.page.length - 1] ?? null,
    });
    assert.equal(second.hasPreviousPage, true);
    const back = sliceOperationalKeysetPage({
      sortedRows: dataset,
      limit,
      direction: 'backward',
      cursor: second.page[0] ?? null,
    });
    assert.deepEqual(
      back.page.map((r) => r.id),
      first.page.map((r) => r.id)
    );
  });

  it('handles null activity timestamps in stable order', () => {
    const nulls = dataset.filter((r) => r.lastActivityAt == null);
    assert.ok(nulls.length >= 2);
    const page = sliceOperationalKeysetPage({
      sortedRows: dataset,
      limit: 50,
      direction: 'forward',
      cursor: null,
    });
    const ids = page.page.map((r) => r.id);
    const eIndex = ids.indexOf('e');
    const fIndex = ids.indexOf('f');
    assert.ok(eIndex >= 0 && fIndex >= 0);
    // id DESC among equal null activity → f before e
    assert.ok(fIndex < eIndex);
  });
});
