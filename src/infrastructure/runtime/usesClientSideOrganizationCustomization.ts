import { env } from '@/infrastructure/config/env';
import { runtimeModes } from '@/infrastructure/config/runtimeModes';

/** Demo, mock auth, and local file mode use in-memory org customization instead of SaaS APIs. */
export function usesClientSideOrganizationCustomization(): boolean {
  return !env.isSaasMode || runtimeModes.useMockAuth() || runtimeModes.isDemoRuntime();
}
