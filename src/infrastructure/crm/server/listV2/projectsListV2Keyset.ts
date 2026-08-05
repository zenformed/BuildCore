/**
 * Operational keyset helpers for Projects list v2 cursors.
 * Order: list_sort_bucket ASC, last_activity_at DESC NULLS LAST, id DESC.
 */

import type { CrmProjectsListV2CursorPayload } from '@/domain/crm/projectsListV2';
import { CrmProjectsListV2InvalidCursorError } from './projectsListCursorCodec';

export type CrmProjectsListV2KeysetValues = {
  readonly listSortBucket: number;
  readonly lastActivityAt: string | null;
  readonly id: string;
};

export function parseOperationalCursorValues(
  payload: CrmProjectsListV2CursorPayload
): CrmProjectsListV2KeysetValues {
  const [bucketRaw, activityRaw, idRaw] = payload.values;
  if (typeof bucketRaw !== 'number' || !Number.isInteger(bucketRaw) || bucketRaw < 0 || bucketRaw > 3) {
    throw new CrmProjectsListV2InvalidCursorError();
  }
  if (!(activityRaw === null || typeof activityRaw === 'string')) {
    throw new CrmProjectsListV2InvalidCursorError();
  }
  if (typeof idRaw !== 'string' || idRaw.trim() === '' || idRaw !== payload.id) {
    throw new CrmProjectsListV2InvalidCursorError();
  }
  if (activityRaw != null) {
    const ms = Date.parse(activityRaw);
    if (!Number.isFinite(ms)) {
      throw new CrmProjectsListV2InvalidCursorError();
    }
  }
  return {
    listSortBucket: bucketRaw,
    lastActivityAt: activityRaw,
    id: idRaw,
  };
}

export function operationalCursorValuesFromRow(row: {
  readonly listSortBucket: number;
  readonly lastActivityAt: string | null;
  readonly id: string;
}): readonly unknown[] {
  return [row.listSortBucket, row.lastActivityAt, row.id];
}

/** Pure page-flag resolution after a limit+1 fetch (before reversing backward pages). */
export function resolveCrmProjectsListV2PageFlags(input: {
  readonly direction: 'forward' | 'backward';
  readonly hasIncomingCursor: boolean;
  readonly fetchedCount: number;
  readonly limit: number;
}): {
  readonly hasNextPage: boolean;
  readonly hasPreviousPage: boolean;
  readonly pageRowCount: number;
  readonly hasExtra: boolean;
} {
  const hasExtra = input.fetchedCount > input.limit;
  const pageRowCount = hasExtra ? input.limit : input.fetchedCount;
  if (input.direction === 'forward') {
    return {
      hasNextPage: hasExtra,
      hasPreviousPage: input.hasIncomingCursor,
      pageRowCount,
      hasExtra,
    };
  }
  return {
    hasNextPage: input.hasIncomingCursor,
    hasPreviousPage: hasExtra,
    pageRowCount,
    hasExtra,
  };
}

/**
 * In-memory operational keyset over a fixed sorted dataset — used by tests to prove
 * stable forward/backward traversal without duplicates.
 */
export function sliceOperationalKeysetPage<T extends CrmProjectsListV2KeysetValues>(input: {
  readonly sortedRows: readonly T[];
  readonly limit: number;
  readonly direction: 'forward' | 'backward';
  readonly cursor: CrmProjectsListV2KeysetValues | null;
}): {
  readonly page: readonly T[];
  readonly hasNextPage: boolean;
  readonly hasPreviousPage: boolean;
} {
  const { sortedRows, limit, direction, cursor } = input;

  const afterForward = (row: T, c: CrmProjectsListV2KeysetValues): boolean => {
    if (row.listSortBucket > c.listSortBucket) return true;
    if (row.listSortBucket < c.listSortBucket) return false;
    if (c.lastActivityAt == null) {
      return row.lastActivityAt == null && row.id < c.id;
    }
    if (row.lastActivityAt == null) return true;
    if (row.lastActivityAt < c.lastActivityAt) return true;
    if (row.lastActivityAt > c.lastActivityAt) return false;
    return row.id < c.id;
  };

  const beforeBackward = (row: T, c: CrmProjectsListV2KeysetValues): boolean => {
    if (row.listSortBucket < c.listSortBucket) return true;
    if (row.listSortBucket > c.listSortBucket) return false;
    if (c.lastActivityAt == null) {
      return row.lastActivityAt != null || (row.lastActivityAt == null && row.id > c.id);
    }
    if (row.lastActivityAt == null) return false;
    if (row.lastActivityAt > c.lastActivityAt) return true;
    if (row.lastActivityAt < c.lastActivityAt) return false;
    return row.id > c.id;
  };

  let candidates: T[];
  if (cursor == null) {
    candidates = direction === 'forward' ? [...sortedRows] : [...sortedRows].reverse();
  } else if (direction === 'forward') {
    candidates = sortedRows.filter((row) => afterForward(row, cursor));
  } else {
    candidates = [...sortedRows].filter((row) => beforeBackward(row, cursor)).reverse();
  }

  const fetched = candidates.slice(0, limit + 1);
  const flags = resolveCrmProjectsListV2PageFlags({
    direction,
    hasIncomingCursor: cursor != null,
    fetchedCount: fetched.length,
    limit,
  });
  let page = fetched.slice(0, flags.pageRowCount);
  if (direction === 'backward') {
    page = [...page].reverse();
  }
  return {
    page,
    hasNextPage: flags.hasNextPage,
    hasPreviousPage: flags.hasPreviousPage,
  };
}
