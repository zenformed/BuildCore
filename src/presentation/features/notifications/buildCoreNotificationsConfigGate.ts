/**
 * Pure gate for when BuildCore may mount the shared notifications controller.
 * Keeps demo/runtime/auth checks out of React memo identity churn.
 */
export type BuildCoreNotificationsConfigGateInput = {
  readonly isDemoRuntime: boolean;
  readonly isSaasMode: boolean;
  readonly useMockAuth: boolean;
  readonly hasAccessToken: boolean;
  readonly membershipContextStatus: string;
  readonly organizationId: string | null | undefined;
  readonly hasActiveMembership: boolean | null | undefined;
};

export function shouldEnableBuildCoreNotifications(
  input: BuildCoreNotificationsConfigGateInput
): boolean {
  if (input.isDemoRuntime) return false;
  if (!input.isSaasMode || input.useMockAuth) return false;
  if (!input.hasAccessToken) return false;
  if (input.membershipContextStatus !== 'ready') return false;
  const organizationId = input.organizationId?.trim() ?? '';
  if (!organizationId) return false;
  if (!input.hasActiveMembership) return false;
  return true;
}
