/**
 * Relay needs-approval notification to ZenformedCore after a workflow task status transition.
 */

import { env } from '@/infrastructure/config/env';
import { getBuildCorePublicAppUrl } from '@/infrastructure/config/buildCorePublicAppUrl';
import { postBuildCoreWorkflowTaskNotifyNeedsApproval } from '@/infrastructure/coreApi/buildCoreCrmNotifyClient';
import {
  logNeedsApprovalNotifyDebug,
  logNeedsApprovalNotifyDebugError,
} from '@/infrastructure/crm/server/needsApprovalNotifyDebug';

export type NotifyWorkflowTaskNeedsApprovalContext = {
  readonly taskId: string;
  readonly previousStatus: string | null;
  readonly nextStatus: string;
  readonly actorUserId: string;
};

export async function notifyWorkflowTaskNeedsApprovalAfterTransition(
  accessToken: string,
  context: NotifyWorkflowTaskNeedsApprovalContext
): Promise<void> {
  const { taskId, previousStatus, nextStatus, actorUserId } = context;

  if (env.zenformedCoreApiBaseUrl == null) {
    logNeedsApprovalNotifyDebug('buildcore_relay_skipped', {
      taskId,
      previousStatus,
      nextStatus,
      actorUserId,
      skippedReason: 'zenformed_core_api_url_unconfigured',
    });
    return;
  }

  logNeedsApprovalNotifyDebug('buildcore_relay_start', {
    taskId,
    previousStatus,
    nextStatus,
    actorUserId,
    coreBaseUrl: env.zenformedCoreApiBaseUrl,
  });

  const result = await postBuildCoreWorkflowTaskNotifyNeedsApproval(accessToken, taskId, {
    appBaseUrl: getBuildCorePublicAppUrl(),
  });

  if (!result.ok) {
    logNeedsApprovalNotifyDebugError('buildcore_relay_failed', {
      taskId,
      previousStatus,
      nextStatus,
      actorUserId,
      errorKind: result.error.kind,
      httpStatus: result.error.kind === 'http_error' ? result.error.status : undefined,
      httpBody: result.error.kind === 'http_error' ? result.error.body : undefined,
      networkMessage: result.error.kind === 'network' ? result.error.message : undefined,
    });
    return;
  }

  logNeedsApprovalNotifyDebug('buildcore_relay_complete', {
    taskId,
    previousStatus,
    nextStatus,
    actorUserId,
    emailDeliveryStatus:
      result.data.skippedReason != null ? null : result.data.emailDeliveryStatus,
    skippedReason: result.data.skippedReason ?? null,
  });
}
