/**
 * Whether organization branding is served from ZenformedCore (SaaS) or local mock storage.
 */

import { env } from '@/infrastructure/config/env';
import { runtimeModes } from '@/infrastructure/config/runtimeModes';

/** Core-owned org branding when SaaS + real auth + `ZENFORMED_CORE_API_URL` is configured. */
export function usesCoreOrganizationBranding(): boolean {
  return (
    runtimeModes.isSaasMode() &&
    !runtimeModes.useMockAuth() &&
    env.zenformedCoreApiBaseUrl != null
  );
}
