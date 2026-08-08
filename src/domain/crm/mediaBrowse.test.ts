import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildCrmMediaBrowseSource,
  CRM_MEDIA_BROWSE_CLIENT_REFRESH_SKEW_SECONDS,
  CRM_MEDIA_BROWSE_SIGNED_URL_TTL_SECONDS,
  crmMediaBrowseSourceNeedsRefresh,
  parseCrmMediaBrowseVariant,
} from '@/domain/crm/mediaBrowse';
import {
  CRM_IMAGE_PREVIEW_MAX_PX,
  CRM_IMAGE_THUMBNAIL_MAX_PX,
} from '@/domain/crm/imageDerivatives';

describe('crm media browse (Phase 0)', () => {
  it('keeps a one-hour signed URL TTL for interactive browsing', () => {
    assert.equal(CRM_MEDIA_BROWSE_SIGNED_URL_TTL_SECONDS, 3600);
    assert.equal(CRM_MEDIA_BROWSE_CLIENT_REFRESH_SKEW_SECONDS, 120);
  });

  it('builds browse sources as original variant with expiresAt', () => {
    const source = buildCrmMediaBrowseSource({
      url: 'https://storage.example/signed',
      expiresInSeconds: 3600,
      mimeType: 'image/jpeg',
      nowMs: Date.parse('2026-08-07T15:00:00.000Z'),
    });
    assert.equal(source.variant, 'original');
    assert.equal(source.url, 'https://storage.example/signed');
    assert.equal(source.mimeType, 'image/jpeg');
    assert.equal(source.expiresAt, '2026-08-07T16:00:00.000Z');
  });

  it('does not put original into thumbnailUrl semantics — variant stays explicit', () => {
    const source = buildCrmMediaBrowseSource({
      url: 'https://storage.example/signed',
      expiresInSeconds: 60,
      mimeType: 'application/pdf',
      variant: 'original',
    });
    assert.equal(source.variant, 'original');
  });

  it('refreshes before expiry skew so gallery tiles do not break mid-session', () => {
    const now = Date.parse('2026-08-07T15:00:00.000Z');
    const fresh = buildCrmMediaBrowseSource({
      url: 'https://storage.example/a',
      expiresInSeconds: 3600,
      mimeType: 'image/png',
      nowMs: now,
    });
    assert.equal(crmMediaBrowseSourceNeedsRefresh(fresh, now), false);

    const almostExpired = buildCrmMediaBrowseSource({
      url: 'https://storage.example/b',
      expiresInSeconds: CRM_MEDIA_BROWSE_CLIENT_REFRESH_SKEW_SECONDS,
      mimeType: 'image/png',
      nowMs: now,
    });
    assert.equal(crmMediaBrowseSourceNeedsRefresh(almostExpired, now), true);
  });

  it('parses browse variants and keeps Phase 1 size contracts', () => {
    assert.equal(parseCrmMediaBrowseVariant('thumbnail'), 'thumbnail');
    assert.equal(parseCrmMediaBrowseVariant('preview'), 'preview');
    assert.equal(parseCrmMediaBrowseVariant('nope'), 'original');
    assert.equal(CRM_IMAGE_THUMBNAIL_MAX_PX, 320);
    assert.equal(CRM_IMAGE_PREVIEW_MAX_PX, 1600);
  });
});
