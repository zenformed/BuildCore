import type { SupabaseClient } from '@supabase/supabase-js';
import { joinBuildCorePublicAppUrl } from '@/infrastructure/config/buildCorePublicAppUrl';
import { createPlatformNotificationOnCore } from '@/infrastructure/coreApi/createPlatformNotificationClient';
import { loadCrmMemberMap } from '@/infrastructure/crm/server/crmMemberMap';
import {
  buildSpreadsheetImportCompletedIdempotencyKey,
  shouldNotifySpreadsheetImportCompleted,
} from '@/domain/crm/spreadsheetImportCompletedNotification';
import {
  buildSpreadsheetImportCompletedNotificationBody,
  SPREADSHEET_IMPORT_COMPLETED_NOTIFICATION_TITLE,
} from '@/domain/crm/spreadsheetImportCompletedNotificationCopy';
import type { CrmImportJobCounts } from '@/domain/crm/spreadsheetImportTypes';

export type NotifySpreadsheetImportCompletedInAppInput = {
  readonly accessToken: string;
  readonly organizationId: string;
  readonly actorUserId: string;
  readonly recipientUserId: string;
  readonly jobId: string;
  readonly status: string;
  readonly counts: CrmImportJobCounts;
  readonly destinationPath: string;
  readonly transitionedToTerminal: boolean;
  readonly supabase: SupabaseClient;
};

function logSpreadsheetImportInAppFailure(fields: Readonly<Record<string, unknown>>): void {
  console.info(
    JSON.stringify({
      tag: 'buildcore_spreadsheet_import_completed_notification',
      event: 'create_failed',
      ...fields,
    })
  );
}

export async function notifySpreadsheetImportCompletedInApp(
  input: NotifySpreadsheetImportCompletedInAppInput
): Promise<{ readonly attempted: boolean; readonly ok: boolean }> {
  if (
    !shouldNotifySpreadsheetImportCompleted({
      recipientUserId: input.recipientUserId,
      status: input.status,
      transitionedToTerminal: input.transitionedToTerminal,
    })
  ) {
    return { attempted: false, ok: true };
  }

  const recipientUserId = input.recipientUserId.trim();
  const memberMap = await loadCrmMemberMap(input.supabase, [input.actorUserId, recipientUserId], {
    organizationId: input.organizationId,
  });
  const actorName = memberMap.get(input.actorUserId)?.displayName ?? 'Someone';
  const destinationUrl = joinBuildCorePublicAppUrl(input.destinationPath);
  const body = buildSpreadsheetImportCompletedNotificationBody({
    actorDisplayName: actorName,
    counts: input.counts,
  });

  const result = await createPlatformNotificationOnCore(input.accessToken, input.organizationId, {
    recipientUserId,
    appSlug: 'buildcore',
    type: 'spreadsheet_import.completed',
    title: SPREADSHEET_IMPORT_COMPLETED_NOTIFICATION_TITLE,
    body,
    destinationUrl,
    actorUserId: input.actorUserId,
    entityType: 'crm_import_job',
    entityId: input.jobId,
    metadata: {
      jobId: input.jobId,
      importStatus: input.status,
      createdSubprojects: input.counts.createdSubprojects,
      createdParents: input.counts.createdParents,
      failedRows: input.counts.failedRows,
      invalidRows: input.counts.invalidRows,
    },
    idempotencyKey: buildSpreadsheetImportCompletedIdempotencyKey({
      jobId: input.jobId,
      recipientUserId,
      status: input.status,
    }),
  });

  if (!result.ok) {
    logSpreadsheetImportInAppFailure({
      jobId: input.jobId,
      organizationId: input.organizationId,
      recipientUserId,
      errorKind: result.error.kind,
      status: result.error.kind === 'http_error' ? result.error.status : undefined,
    });
    return { attempted: true, ok: false };
  }

  return { attempted: true, ok: true };
}
