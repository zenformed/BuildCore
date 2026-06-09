'use client';

import { useEffect, useState } from 'react';
import { env } from '@/infrastructure/config/env';
import { useSaaSProfile } from '@/presentation/hooks/useSaaSProfile';

const blobCache = new Map<string, string>();
const absentCache = new Set<string>();

export function buildProjectPrimaryPhotoApiPath(
  slug: string,
  primaryPhotoPath: string | null | undefined
): string | null {
  if (!primaryPhotoPath) return null;
  return `/api/crm/projects/${encodeURIComponent(slug)}/photo?t=${encodeURIComponent(primaryPhotoPath)}`;
}

export function invalidateProjectPrimaryPhotoBlobCache(apiPath: string | null | undefined): void {
  if (!apiPath) return;
  const cached = blobCache.get(apiPath);
  if (cached) URL.revokeObjectURL(cached);
  blobCache.delete(apiPath);
  absentCache.delete(apiPath);
}

export function useProjectPrimaryPhotoBlob(
  apiPath: string | null | undefined,
  getAccessToken?: () => string | null
): string | null {
  const { session } = useSaaSProfile();
  const [blobUrl, setBlobUrl] = useState<string | null>(() => {
    if (apiPath && blobCache.has(apiPath)) return blobCache.get(apiPath) ?? null;
    return null;
  });

  useEffect(() => {
    if (!apiPath) {
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
        const response = await fetch(apiPath, { credentials: 'include', headers, cache: 'no-store' });
        if (cancelled) return;
        if (!response.ok) {
          absentCache.add(apiPath);
          setBlobUrl(null);
          return;
        }
        const blob = await response.blob();
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
