/**
 * Diagnostic logging for workflow task Needs Approval email notifications.
 * Grep server logs for `needs_approval_notify_debug`.
 */

export type NeedsApprovalNotifyDebugPayload = Record<string, unknown>;

export function logNeedsApprovalNotifyDebug(
  step: string,
  payload: NeedsApprovalNotifyDebugPayload
): void {
  console.log(
    JSON.stringify({
      tag: 'needs_approval_notify_debug',
      step,
      ...payload,
    })
  );
}

export function logNeedsApprovalNotifyDebugError(
  step: string,
  payload: NeedsApprovalNotifyDebugPayload
): void {
  console.error(
    JSON.stringify({
      tag: 'needs_approval_notify_debug',
      level: 'error',
      step,
      ...payload,
    })
  );
}
