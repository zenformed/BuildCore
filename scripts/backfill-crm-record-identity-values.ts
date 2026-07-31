/**
 * Backfill crm_record_identity_values for existing CRM projects/subprojects.
 *
 * Usage:
 *   npx tsx scripts/backfill-crm-record-identity-values.ts
 *   npx tsx scripts/backfill-crm-record-identity-values.ts --organization-id <uuid>
 *   npx tsx scripts/backfill-crm-record-identity-values.ts --after-record-id <uuid> --limit 200
 *   npx tsx scripts/backfill-crm-record-identity-values.ts --max-batches 1
 *
 * Restartable: pass --after-record-id from the last printed nextCursor.
 * Idempotent: each record is delete-and-rebuild via reindexCrmRecordIdentityValues.
 */
import { config } from 'dotenv';
import path from 'node:path';
import { createCrmServiceRoleClient } from '../src/infrastructure/crm/server/createCrmServiceRoleClient';
import { backfillCrmRecordIdentityValuesBatch } from '../src/infrastructure/crm/server/identity/crmRecordIdentityBackfillService';

config({ path: path.resolve(__dirname, '..', '.env.local'), quiet: true });
config({ path: path.resolve(__dirname, '..', '.env'), quiet: true });

function readArg(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  if (index < 0) return undefined;
  return process.argv[index + 1];
}

async function main(): Promise<void> {
  const organizationId = readArg('--organization-id');
  let afterRecordId = readArg('--after-record-id') ?? null;
  const limitRaw = readArg('--limit');
  const maxBatchesRaw = readArg('--max-batches');
  const limit = limitRaw != null ? Number(limitRaw) : 100;
  const maxBatches =
    maxBatchesRaw != null ? Number(maxBatchesRaw) : Number.POSITIVE_INFINITY;
  if (!Number.isFinite(limit) || limit < 1) {
    console.error('Invalid --limit');
    process.exit(1);
  }
  if (maxBatchesRaw != null && (!Number.isFinite(maxBatches) || maxBatches < 1)) {
    console.error('Invalid --max-batches');
    process.exit(1);
  }

  const supabase = createCrmServiceRoleClient();
  if (supabase == null) {
    console.error('FAIL: Supabase service role client unavailable (check env).');
    process.exit(1);
  }

  let totalProcessed = 0;
  let totalSucceeded = 0;
  let totalFailed = 0;
  let totalInserted = 0;
  let batch = 0;

  for (;;) {
    batch += 1;
    const result = await backfillCrmRecordIdentityValuesBatch(supabase, {
      organizationId,
      afterRecordId,
      limit,
    });

    totalProcessed += result.processedCount;
    totalSucceeded += result.succeededCount;
    totalFailed += result.failedCount;
    totalInserted += result.insertedValueCount;

    console.log(
      JSON.stringify({
        batch,
        processedCount: result.processedCount,
        succeededCount: result.succeededCount,
        failedCount: result.failedCount,
        insertedValueCount: result.insertedValueCount,
        nextCursor: result.nextCursor,
        done: result.done,
        failures: result.failures,
      })
    );

    if (result.done || result.nextCursor == null) break;
    afterRecordId = result.nextCursor;
    if (batch >= maxBatches) {
      console.log(
        JSON.stringify({
          stoppedEarly: true,
          reason: 'max_batches',
          nextCursor: result.nextCursor,
        })
      );
      break;
    }
  }

  console.log(
    JSON.stringify({
      summary: true,
      totalProcessed,
      totalSucceeded,
      totalFailed,
      totalInserted,
      finalCursor: afterRecordId,
    })
  );

  if (totalFailed > 0) {
    process.exitCode = 2;
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.stack ?? err.message : err);
  process.exit(1);
});
