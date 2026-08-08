'use client';

import { useEffect, useState } from 'react';
import { crmApiFetch } from '@/infrastructure/crm/api/crmApiClient';
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
  // Demo/static photo shortcut: allow direct use of public assets.
  if (primaryPhotoPath.startsWith('/images/') || primaryPhotoPath.startsWith('images/')) {
    return primaryPhotoPath.startsWith('/') ? primaryPhotoPath : `/${primaryPhotoPath}`;
  }
  return `/api/crm/projects/${encodeURIComponent(slug)}/photo?t=${encodeURIComponent(primaryPhotoPath)}`;
}

export function invalidateProjectPrimaryPhotoBlobCache(apiPath: string | null | undefined): void {
  if (!apiPath) return;
  invalidateSessionBlob(projectPhotoApiPathCacheKey(apiPath));
}

export function useProjectPrimaryPhotoBlob(
  apiPath: string | null | undefined,
  _getAccessToken?: () => string | null
): string | null {
  const cacheKey = apiPath ? projectPhotoApiPathCacheKey(apiPath) : null;
  const [blobUrl, setBlobUrl] = useState<string | null>(() =>
    cacheKey ? (peekSessionBlobUrl(cacheKey) ?? null) : null
  );

  useEffect(() => {
    if (!apiPath || !cacheKey) {
      setBlobUrl(null);
      return;
    }
    if (apiPath.startsWith('/images/')) {
      setBlobUrl(apiPath);
      return;
    }

    const cached = peekSessionBlobUrl(cacheKey);
    if (cached !== undefined) {
      setBlobUrl(cached);
      return;
    }

    let cancelled = false;
    const cancelDefer = deferNonCriticalWork(() => {
      void loadSessionBlob(cacheKey, async () => {
        const response = await crmApiFetch(apiPath);
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
  }, [apiPath, cacheKey]);

  return blobUrl;
}
