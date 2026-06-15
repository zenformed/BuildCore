import {
  buildAuthEntryHref,
  type AuthEntryQueryParams,
  resolvePostAuthRedirectTarget,
} from '@zenformed/core/auth';
import { resolvePlatformPublicAppUrl } from '@/infrastructure/config/platformPublicAppUrl';
import { buildCoreDashboardNavigation as nav } from '@/platform/navigation/buildCoreDashboardNavigation';

export const BUILDCORE_PLATFORM_APP_ID = 'buildcore';

/** BuildCore in-app path (+ query) for Platform `returnTo` / launch `returnPath`. */
export function buildBuildCoreReturnTo(
  pathname: string | null | undefined,
  search?: string | null
): string {
  const path = pathname?.trim() ?? '';
  if (path === '/' || path === '') {
    return nav.routes.dashboard;
  }
  if (!path.startsWith('/') || path.startsWith('//')) {
    return nav.routes.dashboard;
  }
  const rawSearch = search?.trim() ?? '';
  if (!rawSearch) return path;
  return rawSearch.startsWith('?') ? `${path}${rawSearch}` : `${path}?${rawSearch}`;
}

export function buildPlatformLoginUrl(options?: {
  returnTo?: string | null;
  authEntryParams?: Partial<AuthEntryQueryParams> | null;
}): string {
  const origin = resolvePlatformPublicAppUrl();
  const resolvedReturnTo =
    options?.returnTo?.trim() ||
    resolvePostAuthRedirectTarget(
      {
        app: options?.authEntryParams?.app ?? null,
        plan: options?.authEntryParams?.plan ?? null,
        returnTo: options?.authEntryParams?.returnTo ?? null,
        redirect: options?.authEntryParams?.redirect ?? null,
      },
      nav.routes.dashboard
    );

  const href = buildAuthEntryHref('/login', {
    app: BUILDCORE_PLATFORM_APP_ID,
    returnTo: resolvedReturnTo,
    plan: options?.authEntryParams?.plan,
  });
  return `${origin}${href}`;
}

/** Cross-origin navigation to Platform login with BuildCore handoff params. */
export function redirectToPlatformLogin(options?: {
  returnTo?: string | null;
  authEntryParams?: Partial<AuthEntryQueryParams> | null;
}): void {
  window.location.assign(buildPlatformLoginUrl(options));
}
