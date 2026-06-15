/**
 * Local dev helpers for cross-app launch handoff (BuildCore → sibling apps).
 */

const LOCAL_DEV_LAUNCH_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);

function isLocalDevHttpOrigin(origin: string): boolean {
  try {
    const parsed = new URL(origin);
    return parsed.protocol === 'http:' && LOCAL_DEV_LAUNCH_HOSTS.has(parsed.hostname);
  } catch {
    return false;
  }
}

export function normalizeAppPublicOrigin(raw: string | null | undefined): string | null {
  const trimmed = raw?.trim() ?? '';
  if (!trimmed) return null;
  return trimmed.replace(/\/+$/, '');
}

export function resolveLocalLaunchOriginForTargetApp(
  targetApp: string,
  envKey: string,
  defaultPort: number
): string | null {
  const configured = normalizeAppPublicOrigin(process.env[envKey]);
  if (configured != null && isLocalDevHttpOrigin(configured)) return configured;

  if (process.env.NODE_ENV === 'production') return null;

  const fallback = `http://localhost:${defaultPort}`;
  if (targetApp === 'buildcore' && defaultPort === 3020) return fallback;
  if (targetApp === 'forgecore' && defaultPort === 3040) return fallback;
  if (targetApp === 'formcore' && defaultPort === 3050) return fallback;
  return isLocalDevHttpOrigin(fallback) ? fallback : null;
}

export function rewriteLaunchUrlForLocalDev(launchUrl: string, localOrigin: string | null): string {
  if (localOrigin == null) return launchUrl;
  try {
    const url = new URL(launchUrl);
    const local = new URL(localOrigin);
    url.protocol = local.protocol;
    url.host = local.host;
    return url.toString();
  } catch {
    return launchUrl;
  }
}

const TARGET_LOCAL_ORIGIN: Partial<
  Record<string, { envKey: string; defaultPort: number }>
> = {
  buildcore: { envKey: 'BUILDCORE_PUBLIC_APP_URL', defaultPort: 3020 },
  forgecore: { envKey: 'FORGECORE_PUBLIC_APP_URL', defaultPort: 3040 },
  formcore: { envKey: 'FORMCORE_PUBLIC_APP_URL', defaultPort: 3050 },
};

export function resolveLocalLaunchOriginForTarget(targetApp: string): string | null {
  const spec = TARGET_LOCAL_ORIGIN[targetApp];
  if (spec == null) return null;
  return resolveLocalLaunchOriginForTargetApp(targetApp, spec.envKey, spec.defaultPort);
}

export function rewriteTargetLaunchUrlForLocalDev(launchUrl: string, targetApp: string): string {
  return rewriteLaunchUrlForLocalDev(launchUrl, resolveLocalLaunchOriginForTarget(targetApp));
}
