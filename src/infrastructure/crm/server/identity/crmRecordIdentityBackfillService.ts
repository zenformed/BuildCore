import type { SupabaseClient } from '@supabase/supabase-js';
import { reindexCrmRecordIdentityValues } from './crmRecordIdentityReindexService';

export type CrmRecordIdentityBackfillOptions = {
  readonly organizationId?: string;
  /** Exclusive lower bound on crm_projects.id (UUID string order). */
  readonly afterRecordId?: string | null;
  readonly limit?: number;
};

export type CrmRecordIdentityBackfillFailure = {
  readonly recordId: string;
  readonly error: string;
};

export type CrmRecordIdentityBackfillBatchResult = {
  readonly processedCount: number;
  readonly succeededCount: number;
  readonly failedCount: number;
  readonly insertedValueCount: number;
  readonly failures: readonly CrmRecordIdentityBackfillFailure[];
  /** Pass as afterRecordId on the next call. Null when no more rows. */
  readonly nextCursor: string | null;
  readonly done: boolean;
};

const DEFAULT_BATCH_LIMIT = 100;
const MAX_BATCH_LIMIT = 500;

/**
 * Bounded, restartable, idempotent identity backfill batch.
 * Uses the same reindexCrmRecordIdentityValues / extractIdentityValues path as live writes.
 */
export async function backfillCrmRecordIdentityValuesBatch(
  supabase: SupabaseClient,
  options: CrmRecordIdentityBackfillOptions = {}
): Promise<CrmRecordIdentityBackfillBatchResult> {
  const limit = Math.min(
    Math.max(options.limit ?? DEFAULT_BATCH_LIMIT, 1),
    MAX_BATCH_LIMIT
  );
  const afterRecordId = options.afterRecordId?.trim() || null;

  let query = supabase
    .from('crm_projects')
    .select('id, organization_id')
    .order('id', { ascending: true })
    .limit(limit);

  if (options.organizationId) {
    query = query.eq('organization_id', options.organizationId);
  }
  if (afterRecordId) {
    query = query.gt('id', afterRecordId);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`crm_record_identity_backfill_list_failed: ${error.message}`);
  }

  const rows = data ?? [];
  if (rows.length === 0) {
    return {
      processedCount: 0,
      succeededCount: 0,
      failedCount: 0,
      insertedValueCount: 0,
      failures: [],
      nextCursor: null,
      done: true,
    };
  }

  let succeededCount = 0;
  let failedCount = 0;
  let insertedValueCount = 0;
  const failures: CrmRecordIdentityBackfillFailure[] = [];

  for (const row of rows) {
    const recordId = row.id as string;
    const organizationId = row.organization_id as string;
    try {
      const result = await reindexCrmRecordIdentityValues(supabase, organizationId, recordId);
      succeededCount += 1;
      insertedValueCount += result.insertedCount;
    } catch (err) {
      failedCount += 1;
      failures.push({
        recordId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const lastId = rows[rows.length - 1]?.id as string;
  const done = rows.length < limit;

  return {
    processedCount: rows.length,
    succeededCount,
    failedCount,
    insertedValueCount,
    failures,
    nextCursor: done ? null : lastId,
    done,
  };
}
