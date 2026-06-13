/**
 * BuildCore public app origin for server-side emails, portal links, and auth redirects.
 * Env: BUILDCORE_PUBLIC_APP_URL (server), then NEXT_PUBLIC_BUILDCORE_APP_URL, then NEXT_PUBLIC_APP_URL.
 */

export const BUILDCORE_PUBLIC_APP_URL_DEFAULT = 'http://localhost:3020';

export function normalizeBuildCorePublicAppOrigin(
  raw: string | null | undefined
): string | null {
  const trimmed = raw?.trim() ?? '';
  if (!trimmed) return null;
  return trimmed.replace(/\/+$/, '');
}

export function readBuildCorePublicAppUrlFromEnv(): string | null {
  return normalizeBuildCorePublicAppOrigin(
    process.env.BUILDCORE_PUBLIC_APP_URL ??
      process.env.NEXT_PUBLIC_BUILDCORE_APP_URL ??
      process.env.NEXT_PUBLIC_APP_URL
  );
}

export function resolveBuildCorePublicAppUrl(
  overrideBaseUrl?: string | null | undefined
): string {
  const fromOverride = normalizeBuildCorePublicAppOrigin(overrideBaseUrl);
  if (fromOverride) return fromOverride;
  const fromEnv = readBuildCorePublicAppUrlFromEnv();
  if (fromEnv) return fromEnv;
  return BUILDCORE_PUBLIC_APP_URL_DEFAULT;
}

export function joinBuildCorePublicAppUrl(
  pathname: string,
  overrideBaseUrl?: string | null | undefined
): string {
  const base = resolveBuildCorePublicAppUrl(overrideBaseUrl);
  const path = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return `${base}${path}`;
}

/** Server routes and CRM notify relays should use this instead of parsing env inline. */
export function getBuildCorePublicAppUrl(): string {
  return resolveBuildCorePublicAppUrl();
}
