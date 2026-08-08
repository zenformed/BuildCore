/**
 * In-memory cache of authorized CRM media browse sources (signed URLs).
 * Tab-session only — never persists Storage credentials.
 */

import {
  buildCrmMediaBrowseSource,
  CRM_MEDIA_BROWSE_SIGNED_URL_TTL_SECONDS,
  crmMediaBrowseSourceNeedsRefresh,
  type CrmMediaBrowseSource,
  type CrmMediaBrowseVariant,
} from '@/domain/crm/mediaBrowse';
import { runInFlight } from '@/infrastructure/coreApi/clientRequestDedupe';

const sourceByCacheKey = new Map<string, CrmMediaBrowseSource>();
const absentKeys = new Set<string>();
/** List URLs already primed — do not re-seed the same signed URL after expiry/failure. */
const listSeededUrlKeys = new Set<string>();

export function crmMediaBrowseCacheKey(
  documentId: string,
  preferredVariant: CrmMediaBrowseVariant
): string {
  return `${documentId}:${preferredVariant}`;
}

function listSeedKey(cacheKey: string, url: string): string {
  return `${cacheKey}\0${url}`;
}

export function peekCrmMediaBrowseSource(
  documentId: string,
  preferredVariant: CrmMediaBrowseVariant = 'original'
): CrmMediaBrowseSource | null | undefined {
  const cacheKey = crmMediaBrowseCacheKey(documentId, preferredVariant);
  if (absentKeys.has(cacheKey)) return null;
  const cached = sourceByCacheKey.get(cacheKey);
  if (!cached) return undefined;
  if (crmMediaBrowseSourceNeedsRefresh(cached)) {
    sourceByCacheKey.delete(cacheKey);
    return undefined;
  }
  return cached;
}

export function invalidateCrmMediaBrowseSource(
  documentId: string,
  preferredVariant?: CrmMediaBrowseVariant
): void {
  if (preferredVariant) {
    const cacheKey = crmMediaBrowseCacheKey(documentId, preferredVariant);
    sourceByCacheKey.delete(cacheKey);
    absentKeys.delete(cacheKey);
    return;
  }
  for (const variant of ['original', 'thumbnail', 'preview'] as const) {
    const cacheKey = crmMediaBrowseCacheKey(documentId, variant);
    sourceByCacheKey.delete(cacheKey);
    absentKeys.delete(cacheKey);
  }
}

export function seedCrmMediaBrowseSource(
  documentId: string,
  preferredVariant: CrmMediaBrowseVariant,
  source: CrmMediaBrowseSource
): void {
  const cacheKey = crmMediaBrowseCacheKey(documentId, preferredVariant);
  sourceByCacheKey.set(cacheKey, source);
  absentKeys.delete(cacheKey);
}

/**
 * Prime the thumbnail cache from an authorized list response (`thumbnailUrl`).
 * Returns true when the cache was written.
 *
 * Does not re-seed the same list URL after it expires or fails — callers must
 * remint via `/browse`. A new list URL (fresh page fetch) may seed again.
 */
export function seedCrmMediaBrowseThumbnailFromListUrl(
  documentId: string,
  listThumbnailUrl: string,
  nowMs: number = Date.now()
): boolean {
  const url = listThumbnailUrl.trim();
  if (!documentId || !url) return false;

  const cacheKey = crmMediaBrowseCacheKey(documentId, 'thumbnail');
  const peek = peekCrmMediaBrowseSource(documentId, 'thumbnail');
  if (peek !== undefined) return false;

  const seedKey = listSeedKey(cacheKey, url);
  if (listSeededUrlKeys.has(seedKey)) return false;

  listSeededUrlKeys.add(seedKey);
  seedCrmMediaBrowseSource(
    documentId,
    'thumbnail',
    buildCrmMediaBrowseSource({
      url,
      expiresInSeconds: CRM_MEDIA_BROWSE_SIGNED_URL_TTL_SECONDS,
      mimeType: 'image/webp',
      variant: 'thumbnail',
      nowMs,
    })
  );
  return true;
}

/** Seed every authorized list thumbnail URL (Photos v2 page → gallery). */
export function seedCrmMediaBrowseThumbnailsFromListUrls(
  thumbnailUrlByDocumentId: ReadonlyMap<string, string>
): void {
  for (const [documentId, url] of thumbnailUrlByDocumentId) {
    seedCrmMediaBrowseThumbnailFromListUrl(documentId, url);
  }
}

export async function loadCrmMediaBrowseSource(
  documentId: string,
  preferredVariant: CrmMediaBrowseVariant,
  fetchSource: () => Promise<CrmMediaBrowseSource | null>
): Promise<CrmMediaBrowseSource | null> {
  const peek = peekCrmMediaBrowseSource(documentId, preferredVariant);
  if (peek !== undefined) return peek;

  const cacheKey = crmMediaBrowseCacheKey(documentId, preferredVariant);
  return runInFlight(`crm-media-browse:${cacheKey}`, async () => {
    const cached = peekCrmMediaBrowseSource(documentId, preferredVariant);
    if (cached !== undefined) return cached;

    try {
      const source = await fetchSource();
      if (!source) {
        absentKeys.add(cacheKey);
        return null;
      }
      seedCrmMediaBrowseSource(documentId, preferredVariant, source);
      return source;
    } catch {
      return null;
    }
  });
}
