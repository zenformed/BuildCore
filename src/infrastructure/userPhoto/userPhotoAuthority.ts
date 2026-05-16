/**
 * Whether user profile photos are served from ZenformedCore (SaaS) or local mock storage.
 */

import { env } from '@/infrastructure/config/env';
import { runtimeModes } from '@/infrastructure/config/runtimeModes';

/** Core-owned avatars when SaaS + real auth + `ZENFORMED_CORE_API_URL` is configured. */
export function usesCoreUserAvatars(): boolean {
  return (
    runtimeModes.isSaasMode() &&
    !runtimeModes.useMockAuth() &&
    env.zenformedCoreApiBaseUrl != null
  );
}
