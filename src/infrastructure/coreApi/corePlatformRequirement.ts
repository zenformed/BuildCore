import { getRuntimeEntitlementSourceMode } from '@/infrastructure/config/runtimeEntitlementSource';
import { env } from '@/infrastructure/config/env';
import { runtimeModes } from '@/infrastructure/config/runtimeModes';

/** SaaS session expects ZenformedCore profile/entitlement relays (not mock / profile-only). */
export function isZenformedCorePlatformRequired(): boolean {
  return (
    runtimeModes.isSaasMode() &&
    !runtimeModes.useMockAuth() &&
    getRuntimeEntitlementSourceMode() === 'core'
  );
}

/** CRM can run without Core when using local mock repositories. */
export function allowsDegradedCrmWithoutCore(): boolean {
  return env.crmDataSource === 'mock';
}
