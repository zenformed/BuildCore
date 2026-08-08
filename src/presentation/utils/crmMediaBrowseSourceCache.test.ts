import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildCrmMediaBrowseSource,
  CRM_MEDIA_BROWSE_SIGNED_URL_TTL_SECONDS,
} from '@/domain/crm/mediaBrowse';
import {
  invalidateCrmMediaBrowseSource,
  peekCrmMediaBrowseSource,
  seedCrmMediaBrowseSource,
  seedCrmMediaBrowseThumbnailFromListUrl,
  seedCrmMediaBrowseThumbnailsFromListUrls,
} from '@/presentation/utils/crmMediaBrowseSourceCache';

describe('crmMediaBrowseSourceCache list thumbnail seeding (Slice A)', () => {
  it('seeds a list thumbnail URL into the thumbnail cache with TTL semantics', () => {
    const documentId = 'seed-thumb-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    const url = 'https://storage.example/object/sign/derivatives/v1/thumb.webp?token=a';
    const nowMs = Date.now();

    assert.equal(seedCrmMediaBrowseThumbnailFromListUrl(documentId, url, nowMs), true);
    const peek = peekCrmMediaBrowseSource(documentId, 'thumbnail');
    assert.ok(peek);
    assert.equal(peek.url, url);
    assert.equal(peek.variant, 'thumbnail');
    assert.equal(peek.mimeType, 'image/webp');
    assert.equal(
      peek.expiresAt,
      new Date(nowMs + CRM_MEDIA_BROWSE_SIGNED_URL_TTL_SECONDS * 1000).toISOString()
    );
  });

  it('does not re-seed the same list URL after invalidate (browse remint path)', () => {
    const documentId = 'seed-thumb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
    const url = 'https://storage.example/object/sign/derivatives/v1/thumb.webp?token=b';

    assert.equal(seedCrmMediaBrowseThumbnailFromListUrl(documentId, url), true);
    invalidateCrmMediaBrowseSource(documentId, 'thumbnail');
    assert.equal(peekCrmMediaBrowseSource(documentId, 'thumbnail'), undefined);
    assert.equal(seedCrmMediaBrowseThumbnailFromListUrl(documentId, url), false);
    assert.equal(peekCrmMediaBrowseSource(documentId, 'thumbnail'), undefined);
  });

  it('allows a fresh list URL to seed after a prior list URL was used', () => {
    const documentId = 'seed-thumb-cccc-4ccc-8ccc-cccccccccccc';
    const url1 = 'https://storage.example/object/sign/derivatives/v1/thumb.webp?token=c1';
    const url2 = 'https://storage.example/object/sign/derivatives/v1/thumb.webp?token=c2';

    assert.equal(seedCrmMediaBrowseThumbnailFromListUrl(documentId, url1), true);
    invalidateCrmMediaBrowseSource(documentId, 'thumbnail');
    assert.equal(seedCrmMediaBrowseThumbnailFromListUrl(documentId, url2), true);
    assert.equal(peekCrmMediaBrowseSource(documentId, 'thumbnail')?.url, url2);
  });

  it('does not overwrite a valid cached thumbnail from browse remint', () => {
    const documentId = 'seed-thumb-dddd-4ddd-8ddd-dddddddddddd';
    const reminted = 'https://storage.example/object/sign/derivatives/v1/thumb.webp?token=remint';
    const listUrl = 'https://storage.example/object/sign/derivatives/v1/thumb.webp?token=list';

    seedCrmMediaBrowseSource(
      documentId,
      'thumbnail',
      buildCrmMediaBrowseSource({
        url: reminted,
        expiresInSeconds: CRM_MEDIA_BROWSE_SIGNED_URL_TTL_SECONDS,
        mimeType: 'image/webp',
        variant: 'thumbnail',
      })
    );
    assert.equal(seedCrmMediaBrowseThumbnailFromListUrl(documentId, listUrl), false);
    assert.equal(peekCrmMediaBrowseSource(documentId, 'thumbnail')?.url, reminted);
  });

  it('batch-seeds a Photos page map', () => {
    const id1 = 'seed-thumb-eeee-4eee-8eee-eeeeeeeeeeee';
    const id2 = 'seed-thumb-ffff-4fff-8fff-ffffffffffff';
    seedCrmMediaBrowseThumbnailsFromListUrls(
      new Map([
        [id1, 'https://storage.example/t1.webp?token=1'],
        [id2, 'https://storage.example/t2.webp?token=2'],
      ])
    );
    assert.equal(
      peekCrmMediaBrowseSource(id1, 'thumbnail')?.url,
      'https://storage.example/t1.webp?token=1'
    );
    assert.equal(
      peekCrmMediaBrowseSource(id2, 'thumbnail')?.url,
      'https://storage.example/t2.webp?token=2'
    );
  });

});
