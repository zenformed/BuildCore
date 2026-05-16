import { getCoreHealth, getRegisteredApp } from '@/infrastructure/coreApi/client';
import { env } from '@/infrastructure/config/env';
import type { CoreApiResult, ZenformedCoreHealthBody, ZenformedCoreRegisteredAppEnvelope } from '@/infrastructure/coreApi/types';

/**
 * Non-authoritative connectivity snapshot for scripts or support.
 * Safe when Core is down or env is unset — never throws.
 */
export async function diagnoseZenformedCoreConnectivity(): Promise<{
  baseUrlConfigured: boolean;
  health: CoreApiResult<ZenformedCoreHealthBody>;
  registeredForgeCoreApp: CoreApiResult<ZenformedCoreRegisteredAppEnvelope>;
}> {
  const baseUrlConfigured = env.zenformedCoreApiBaseUrl != null;
  const [health, registeredForgeCoreApp] = await Promise.all([
    getCoreHealth(),
    getRegisteredApp('forgecore'),
  ]);
  return { baseUrlConfigured, health, registeredForgeCoreApp };
}
