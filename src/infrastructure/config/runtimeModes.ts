import { env } from './env';
import { isDemoRuntimeClient } from '@/infrastructure/runtime/buildCoreRuntime';

/**
 * Central runtime mode resolver used by both client and server modules.
 * Keep these helpers as thin wrappers around existing env behavior.
 */
export const runtimeModes = {
  /** SaaS mode gate used by auth/config APIs and SaaS UI flows. */
  isSaasMode(): boolean {
    return env.isSaasMode;
  },
  /** Interactive demo runtime (client pathname/host or deploy flag). */
  isDemoRuntime(): boolean {
    return isDemoRuntimeClient();
  },
  /** @deprecated Legacy client flag — prefer `isDemoRuntime()`. */
  isDemoMode(): boolean {
    return env.isDemoMode;
  },
  /** Local mock/file-backed auth mode toggle. */
  useMockAuth(): boolean {
    return env.useMockAuth;
  },
  /**
   * Local/file-mode umbrella used as a planning boundary flag:
   * currently defined as "not SaaS mode".
   */
  isLocalFileMode(): boolean {
    return !env.isSaasMode;
  },
} as const;

