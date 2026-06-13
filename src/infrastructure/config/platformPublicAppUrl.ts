/**
 * ZenformedPlatform public app origin for cross-app auth redirects.
 * Env: PLATFORM_PUBLIC_APP_URL (server), NEXT_PUBLIC_PLATFORM_APP_URL (client).
 */

export const PLATFORM_PUBLIC_APP_URL_DEFAULT = 'http://localhost:3030';

export function normalizePlatformPublicAppOrigin(raw: string | null | undefined): string | null {
  const trimmed = raw?.trim() ?? '';
  if (!trimmed) return null;
  return trimmed.replace(/\/+$/, '');
}

export function readPlatformPublicAppUrlFromEnv(): string | null {
  return normalizePlatformPublicAppOrigin(
    process.env.PLATFORM_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_PLATFORM_APP_URL
  );
}

export function resolvePlatformPublicAppUrl(overrideBaseUrl?: string | null | undefined): string {
  const fromOverride = normalizePlatformPublicAppOrigin(overrideBaseUrl);
  if (fromOverride) return fromOverride;
  const fromEnv = readPlatformPublicAppUrlFromEnv();
  if (fromEnv) return fromEnv;
  return PLATFORM_PUBLIC_APP_URL_DEFAULT;
}
