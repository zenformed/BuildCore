'use client';

import { useEffect, useState } from 'react';
import type { CrmDocumentMetadata } from '@/domain/crm';
import type { CrmMediaBrowseSource, CrmMediaBrowseVariant } from '@/domain/crm/mediaBrowse';
import { env } from '@/infrastructure/config/env';
import { isDemoRuntimeClient } from '@/infrastructure/runtime/buildCoreRuntime';
import { getSession } from '@/infrastructure/supabase/supabaseClient';
import {
  invalidateCrmMediaBrowseSource,
  loadCrmMediaBrowseSource,
  peekCrmMediaBrowseSource,
  seedCrmMediaBrowseThumbnailFromListUrl,
} from '@/presentation/utils/crmMediaBrowseSourceCache';

export function buildCrmDocumentBrowseApiPath(
  projectSlug: string,
  documentId: string,
  preferredVariant: CrmMediaBrowseVariant = 'original'
): string {
  const path = `/api/crm/projects/${encodeURIComponent(projectSlug)}/documents/${encodeURIComponent(documentId)}/browse`;
  if (preferredVariant === 'original') return path;
  return `${path}?variant=${encodeURIComponent(preferredVariant)}`;
}

async function fetchAuthorizedBrowseSource(
  projectSlug: string,
  documentId: string,
  preferredVariant: CrmMediaBrowseVariant
): Promise<CrmMediaBrowseSource | null> {
  const session = await getSession();
  const token = session?.access_token;
  if (env.isSaasMode && (token == null || token.trim() === '')) return null;
  const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
  const response = await fetch(
    buildCrmDocumentBrowseApiPath(projectSlug, documentId, preferredVariant),
    {
      credentials: 'include',
      headers,
      cache: 'no-store',
    }
  );
  if (!response.ok) return null;
  const json = (await response.json()) as { source?: CrmMediaBrowseSource };
  if (
    json.source == null ||
    typeof json.source.url !== 'string' ||
    json.source.url.trim() === '' ||
    typeof json.source.expiresAt !== 'string'
  ) {
    return null;
  }
  return json.source;
}

function demoBrowseUrl(doc: CrmDocumentMetadata): string | null {
  const rawName = doc.name.trim();
  if (rawName.startsWith('/images/')) return rawName;
  if (rawName.startsWith('images/')) return `/${rawName}`;
  return null;
}

function peekOrSeedListThumbnail(
  documentId: string,
  preferredVariant: CrmMediaBrowseVariant,
  listThumbnailUrl: string | null | undefined
): string | null {
  if (preferredVariant === 'thumbnail' && listThumbnailUrl) {
    seedCrmMediaBrowseThumbnailFromListUrl(documentId, listThumbnailUrl);
  }
  return peekCrmMediaBrowseSource(documentId, preferredVariant)?.url ?? null;
}

/**
 * Lazy-loads an authorized browse URL for gallery tiles / preview.
 * Prefer durable derivatives via `preferredVariant` (thumbnail | preview).
 *
 * When `listThumbnailUrl` is provided (Photos list v2), the cache is seeded and
 * `/browse?variant=thumbnail` is skipped while that signed URL remains valid.
 */
export function useCrmDocumentBrowseUrl(
  projectSlug: string,
  doc: CrmDocumentMetadata | null,
  enabled: boolean,
  reloadToken: number = 0,
  preferredVariant: CrmMediaBrowseVariant = 'original',
  listThumbnailUrl: string | null = null
): string | null {
  const documentId = doc?.id ?? null;
  const [url, setUrl] = useState<string | null>(() => {
    if (!documentId) return null;
    return peekOrSeedListThumbnail(documentId, preferredVariant, listThumbnailUrl);
  });

  useEffect(() => {
    if (!documentId) {
      setUrl(null);
      return;
    }

    if (isDemoRuntimeClient()) {
      if (doc) setUrl(demoBrowseUrl(doc));
      return;
    }

    const cachedUrl = peekOrSeedListThumbnail(
      documentId,
      preferredVariant,
      listThumbnailUrl
    );
    if (cachedUrl) {
      setUrl(cachedUrl);
      return;
    }

    if (!enabled || !doc) {
      if (!enabled) return;
      setUrl(null);
      return;
    }

    let cancelled = false;
    void loadCrmMediaBrowseSource(documentId, preferredVariant, () =>
      fetchAuthorizedBrowseSource(projectSlug, documentId, preferredVariant)
    ).then((source) => {
      if (!cancelled) setUrl(source?.url ?? null);
    });

    return () => {
      cancelled = true;
    };
  }, [
    doc,
    documentId,
    enabled,
    listThumbnailUrl,
    preferredVariant,
    projectSlug,
    reloadToken,
  ]);

  return url;
}

/** Drop cached signed URL(s) so the next load remints. */
export function refreshCrmDocumentBrowseUrl(
  documentId: string,
  preferredVariant?: CrmMediaBrowseVariant
): void {
  invalidateCrmMediaBrowseSource(documentId, preferredVariant);
}
