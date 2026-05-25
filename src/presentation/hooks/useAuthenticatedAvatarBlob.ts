'use client';

import { useEffect, useState } from 'react';
import { env } from '@/infrastructure/config/env';
import { useSaaSProfile } from '@/presentation/hooks/useSaaSProfile';

const blobCache = new Map<string, string>();
const absentCache = new Set<string>();

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
 */
export function useAuthenticatedAvatarBlob(
  apiPath: string | null | undefined,
  getAccessToken?: () => string | null
): string | null {
  const { session } = useSaaSProfile();
  const [blobUrl, setBlobUrl] = useState<string | null>(() => {
    if (apiPath && blobCache.has(apiPath)) return blobCache.get(apiPath) ?? null;
    return null;
  });

  useEffect(() => {
    if (!apiPath || !shouldFetchAvatarApiPath(apiPath)) {
      setBlobUrl(null);
      return;
    }

    if (absentCache.has(apiPath)) {
      setBlobUrl(null);
      return;
    }

    const cached = blobCache.get(apiPath);
    if (cached) {
      setBlobUrl(cached);
      return;
    }

    let cancelled = false;
    const load = async () => {
      try {
        const token = env.isSaasMode
          ? (getAccessToken?.() ?? session?.access_token ?? null)
          : null;
        const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
        const res = await fetch(apiPath, { credentials: 'include', headers });
        if (cancelled) return;
        if (!res.ok) {
          absentCache.add(apiPath);
          setBlobUrl(null);
          return;
        }
        const blob = await res.blob();
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        blobCache.set(apiPath, url);
        setBlobUrl(url);
      } catch {
        if (!cancelled) setBlobUrl(null);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [apiPath, getAccessToken, session?.access_token]);

  return blobUrl;
}
