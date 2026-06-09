'use client';

import { useEffect, useState } from 'react';
import { env } from '@/infrastructure/config/env';
import { useSaaSProfile } from '@/presentation/hooks/useSaaSProfile';
import { deferNonCriticalWork } from '@/presentation/utils/deferNonCriticalWork';
import {
  avatarApiPathCacheKey,
  loadSessionBlob,
  peekSessionBlobUrl,
} from '@/presentation/utils/sessionBlobCache';

function isUserAvatarApiPath(url: string): boolean {
  return url.startsWith('/api/auth/user-avatar') || url.startsWith('/api/auth/avatar');
}

/** Cross-user avatars require `t=` (revision); missing revision means show initials, no fetch. */
function shouldFetchAvatarApiPath(url: string): boolean {
  if (!isUserAvatarApiPath(url)) return false;
  if (!url.startsWith('/api/auth/user-avatar')) return true;
  try {
    const parsed = new URL(url, 'http://local');
    return parsed.searchParams.has('t');
  } catch {
    return false;
  }
}

/**
 * Loads `/api/auth/user-avatar` (or `/api/auth/avatar`) with Bearer token and returns a blob URL.
 * Fetch is deferred and cached for the session by user/avatar token.
 */
export function useAuthenticatedAvatarBlob(
  apiPath: string | null | undefined,
  getAccessToken?: () => string | null
): string | null {
  const { session } = useSaaSProfile();
  const cacheKey = apiPath ? avatarApiPathCacheKey(apiPath) : null;
  const [blobUrl, setBlobUrl] = useState<string | null>(() =>
    cacheKey ? (peekSessionBlobUrl(cacheKey) ?? null) : null
  );

  useEffect(() => {
    if (!apiPath || !cacheKey || !shouldFetchAvatarApiPath(apiPath)) {
      setBlobUrl(null);
      return;
    }

    const cached = peekSessionBlobUrl(cacheKey);
    if (cached !== undefined) {
      setBlobUrl(cached);
      return;
    }

    let cancelled = false;
    const cancelDefer = deferNonCriticalWork(() => {
      const token = env.isSaasMode
        ? (getAccessToken?.() ?? session?.access_token ?? null)
        : null;
      void loadSessionBlob(cacheKey, async () => {
        const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
        const res = await fetch(apiPath, { credentials: 'include', headers });
        if (!res.ok) return null;
        return res.blob();
      }).then((url) => {
        if (!cancelled) setBlobUrl(url);
      });
    });
    return () => {
      cancelled = true;
      cancelDefer();
    };
  }, [apiPath, cacheKey, getAccessToken, session?.access_token]);

  return blobUrl;
}
