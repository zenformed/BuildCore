'use client';

import { useEffect, useState } from 'react';
import { env } from '@/infrastructure/config/env';
import { getSession } from '@/infrastructure/supabase/supabaseClient';
import { deferNonCriticalWork } from '@/presentation/utils/deferNonCriticalWork';
import {
  loadSessionBlob,
  peekSessionBlobUrl,
} from '@/presentation/utils/sessionBlobCache';
import {
  buildCrmProjectDocumentDownloadApiPath,
  crmProjectDocumentDownloadTargetFromMetadata,
} from '@/presentation/features/crmProjectDetail/downloadCrmProjectDocument';
import { documentPreviewBlobCacheKey } from '@/presentation/features/crmProjectDetail/documentGalleryMedia';
import type { CrmDocumentMetadata } from '@/domain/crm';
import { isDemoRuntimeClient } from '@/infrastructure/runtime/buildCoreRuntime';

/**
 * Lazy-loads an authenticated document blob for gallery tiles / preview.
 * Only fetches when `enabled` (e.g. intersection visible).
 */
export function useCrmDocumentPreviewBlob(
  projectSlug: string,
  doc: CrmDocumentMetadata | null,
  enabled: boolean
): string | null {
  const documentId = doc?.id ?? null;
  const cacheKey = documentId ? documentPreviewBlobCacheKey(documentId) : null;
  const [blobUrl, setBlobUrl] = useState<string | null>(() =>
    cacheKey ? (peekSessionBlobUrl(cacheKey) ?? null) : null
  );

  useEffect(() => {
    if (!enabled || !doc || !cacheKey || isDemoRuntimeClient()) {
      if (!enabled) return;
      setBlobUrl(cacheKey ? (peekSessionBlobUrl(cacheKey) ?? null) : null);
      return;
    }

    const cached = peekSessionBlobUrl(cacheKey);
    if (cached !== undefined) {
      setBlobUrl(cached);
      return;
    }

    let cancelled = false;
    const apiPath = buildCrmProjectDocumentDownloadApiPath(
      crmProjectDocumentDownloadTargetFromMetadata(projectSlug, doc)
    );

    const cancelDefer = deferNonCriticalWork(() => {
      void loadSessionBlob(cacheKey, async () => {
        const session = await getSession();
        const token = session?.access_token;
        if (env.isSaasMode && (token == null || token.trim() === '')) return null;
        const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
        const response = await fetch(apiPath, {
          credentials: 'include',
          headers,
          cache: 'no-store',
        });
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
  }, [cacheKey, doc, enabled, projectSlug]);

  return blobUrl;
}
