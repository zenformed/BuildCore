'use client';

import { useEffect, useState } from 'react';
import { env } from '@/infrastructure/config/env';
import { useSaaSProfile } from '@/presentation/hooks/useSaaSProfile';

const blobCache = new Map<string, string>();

function isUserAvatarApiPath(url: string): boolean {
  return url.startsWith('/api/auth/user-avatar') || url.startsWith('/api/auth/avatar');
}

/**
 * Loads `/api/auth/user-avatar` (or `/api/auth/avatar`) with Bearer token and returns a blob URL.
 * Same auth pattern as `useUserAvatar` for the header.
 */
export function useAuthenticatedAvatarBlob(apiPath: string | null | undefined): string | null {
  const { session } = useSaaSProfile();
  const [blobUrl, setBlobUrl] = useState<string | null>(() => {
    if (apiPath && blobCache.has(apiPath)) return blobCache.get(apiPath) ?? null;
    return null;
  });

  useEffect(() => {
    if (!apiPath || !isUserAvatarApiPath(apiPath)) {
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
        const token = env.isSaasMode ? session?.access_token ?? null : null;
        const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
        const res = await fetch(apiPath, { credentials: 'include', headers });
        if (cancelled || !res.ok) return;
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
  }, [apiPath, session?.access_token]);

  return blobUrl;
}
