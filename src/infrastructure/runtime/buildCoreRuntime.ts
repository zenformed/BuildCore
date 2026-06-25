/**
 * BuildCore application runtime — LIVE (production) vs DEMO (interactive demo).
 * Feature code should branch on runtime via providers and adapters, not ad-hoc env checks.
 */

export type BuildCoreRuntime = 'LIVE' | 'DEMO';

const DEMO_PATH_PREFIX = '/demo';
const DEMO_HOST_PREFIX = 'demo.';

/**
 * Hostname used for dedicated demo deployments (e.g. demo.buildcore.zenformed.com).
 */
export function isDemoDeploymentHost(hostname: string): boolean {
  const normalized = hostname.trim().toLowerCase();
  return normalized.startsWith(DEMO_HOST_PREFIX);
}

/**
 * Pathname is under the in-app demo route group.
 */
export function isDemoPathname(pathname: string | null | undefined): boolean {
  if (pathname == null || pathname === '') return false;
  return pathname === DEMO_PATH_PREFIX || pathname.startsWith(`${DEMO_PATH_PREFIX}/`);
}

/**
 * Resolve runtime from deploy flag (server-safe) and optional pathname hint.
 */
export function resolveBuildCoreRuntime(pathname?: string | null): BuildCoreRuntime {
  if (process.env.NEXT_PUBLIC_BUILDCORE_RUNTIME === 'demo') {
    return 'DEMO';
  }
  if (pathname != null && isDemoPathname(pathname)) {
    return 'DEMO';
  }
  return 'LIVE';
}

/**
 * Client-only runtime resolution including hostname and current pathname.
 */
export function resolveBuildCoreRuntimeClient(pathname?: string | null): BuildCoreRuntime {
  if (typeof window !== 'undefined') {
    if (isDemoDeploymentHost(window.location.hostname)) {
      return 'DEMO';
    }
    const path = pathname ?? window.location.pathname;
    if (isDemoPathname(path)) {
      return 'DEMO';
    }
  }
  return resolveBuildCoreRuntime(pathname);
}

/**
 * Whether the active client runtime is DEMO.
 * Always false during SSR — demo pages gate rendering until hydrated.
 */
export function isDemoRuntimeClient(pathname?: string | null): boolean {
  return resolveBuildCoreRuntimeClient(pathname) === 'DEMO';
}

/**
 * Whether the active runtime is LIVE (inverse helper for readability).
 */
export function isLiveRuntimeClient(pathname?: string | null): boolean {
  return !isDemoRuntimeClient(pathname);
}
