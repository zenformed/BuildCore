/**
 * CRM media browse delivery (Phase 0).
 *
 * Browse surfaces use short-lived signed Storage URLs after BuildCore authorizes
 * access. Phase 1 derivatives plug into the same `CrmMediaBrowseSource` shape
 * via `variant` without changing gallery consumers.
 */

/** Interactive gallery / lightbox TTL — long enough for a browse session, short enough if leaked. */
export const CRM_MEDIA_BROWSE_SIGNED_URL_TTL_SECONDS = 60 * 60;

/** Refresh client-side before expiry so mid-scroll tiles do not break. */
export const CRM_MEDIA_BROWSE_CLIENT_REFRESH_SKEW_SECONDS = 120;

/**
 * Which bytes the browse URL points at.
 * Prefer thumbnail/preview when durable derivatives exist; fall back to original.
 */
export type CrmMediaBrowseVariant = 'original' | 'thumbnail' | 'preview';

export function parseCrmMediaBrowseVariant(
  raw: string | null | undefined
): CrmMediaBrowseVariant {
  if (raw === 'thumbnail' || raw === 'preview' || raw === 'original') return raw;
  return 'original';
}

export type CrmMediaBrowseSource = {
  readonly url: string;
  /** ISO-8601 expiry of the signed URL. */
  readonly expiresAt: string;
  readonly mimeType: string;
  readonly variant: CrmMediaBrowseVariant;
};

export type CrmMediaBrowseSourceResponse = {
  readonly source: CrmMediaBrowseSource;
};

export function buildCrmMediaBrowseSource(input: {
  readonly url: string;
  readonly expiresInSeconds: number;
  readonly mimeType: string;
  readonly variant?: CrmMediaBrowseVariant;
  readonly nowMs?: number;
}): CrmMediaBrowseSource {
  const nowMs = input.nowMs ?? Date.now();
  const ttl = Math.max(1, Math.floor(input.expiresInSeconds));
  return {
    url: input.url,
    expiresAt: new Date(nowMs + ttl * 1000).toISOString(),
    mimeType: input.mimeType.trim() || 'application/octet-stream',
    variant: input.variant ?? 'original',
  };
}

/** True when the client should mint a fresh signed URL before using `source`. */
export function crmMediaBrowseSourceNeedsRefresh(
  source: CrmMediaBrowseSource,
  nowMs: number = Date.now(),
  skewSeconds: number = CRM_MEDIA_BROWSE_CLIENT_REFRESH_SKEW_SECONDS
): boolean {
  const expiresAtMs = Date.parse(source.expiresAt);
  if (!Number.isFinite(expiresAtMs)) return true;
  return expiresAtMs - nowMs <= skewSeconds * 1000;
}
