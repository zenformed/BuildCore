'use client';

import { useEffect, useState } from 'react';
import { env } from '@/infrastructure/config/env';
import { useSaaSProfile } from '@/presentation/hooks/useSaaSProfile';
import { deferNonCriticalWork } from '@/presentation/utils/deferNonCriticalWork';
import {
  invalidateSessionBlob,
  loadSessionBlob,
  peekSessionBlobUrl,
  projectPhotoApiPathCacheKey,
} from '@/presentation/utils/sessionBlobCache';

export function buildProjectPrimaryPhotoApiPath(
  slug: string,
  primaryPhotoPath: string | null | undefined
): string | null {
  if (!primaryPhotoPath) return null;
  return `/api/crm/projects/${encodeURIComponent(slug)}/photo?t=${encodeURIComponent(primaryPhotoPath)}`;
}

export function invalidateProjectPrimaryPhotoBlobCache(apiPath: string | null | undefined): void {
  if (!apiPath) return;
  invalidateSessionBlob(projectPhotoApiPathCacheKey(apiPath));
}

export function useProjectPrimaryPhotoBlob(
  apiPath: string | null | undefined,
  getAccessToken?: () => string | null
): string | null {
  const { session } = useSaaSProfile();
  const cacheKey = apiPath ? projectPhotoApiPathCacheKey(apiPath) : null;
  const [blobUrl, setBlobUrl] = useState<string | null>(() =>
    cacheKey ? (peekSessionBlobUrl(cacheKey) ?? null) : null
  );

  useEffect(() => {
    if (!apiPath || !cacheKey) {
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
        const response = await fetch(apiPath, { credentials: 'include', headers, cache: 'no-store' });
        if (!response.ok) return null;
        return response.blob();
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
