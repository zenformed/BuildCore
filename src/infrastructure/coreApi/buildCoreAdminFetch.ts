/**
 * Fresh fetch helpers for admin-sensitive BuildCore BFF routes.
 * Avoid browser/Next client reuse of permission settings responses.
 */

export const BUILDCORE_ADMIN_NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, private',
  Pragma: 'no-cache',
} as const;

export function buildCoreAdminFetchUrl(path: string): string {
  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}_=${Date.now()}`;
}

export function buildCoreAdminFetchInit(
  accessToken: string,
  init: RequestInit = {}
): RequestInit {
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  headers.set('Authorization', `Bearer ${accessToken}`);
  headers.set('Cache-Control', 'no-cache');
  headers.set('Pragma', 'no-cache');

  return {
    ...init,
    cache: 'no-store',
    headers,
  };
}
