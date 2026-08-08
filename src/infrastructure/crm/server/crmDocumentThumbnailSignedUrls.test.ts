import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { CRM_MEDIA_BROWSE_SIGNED_URL_TTL_SECONDS } from '@/domain/crm/mediaBrowse';
import { loadCrmDocumentThumbnailSignedUrls } from './crmDocumentThumbnailSignedUrls';

describe('loadCrmDocumentThumbnailSignedUrls', () => {
  it('returns empty map when storage is null or documentIds empty', async () => {
    const emptyIds = await loadCrmDocumentThumbnailSignedUrls({
      supabase: {} as never,
      organizationId: 'org',
      documentIds: ['a'],
      storage: null,
    });
    assert.equal(emptyIds.size, 0);

    const emptyDocs = await loadCrmDocumentThumbnailSignedUrls({
      supabase: {} as never,
      organizationId: 'org',
      documentIds: [],
      storage: {
        putObject: async () => undefined,
        deleteObject: async () => undefined,
        createSignedDownloadUrl: async () => 'https://example.test/x',
      },
    });
    assert.equal(emptyDocs.size, 0);
  });

  it('mints signed URLs only for rows with thumbnail_storage_key in the org', async () => {
    const signedCalls: Array<{
      bucket: string;
      storageKey: string;
      expiresInSeconds?: number;
    }> = [];
    const supabase = {
      from(table: string) {
        assert.equal(table, 'crm_documents');
        return {
          select() {
            return this;
          },
          eq() {
            return this;
          },
          in() {
            return this;
          },
          not() {
            return Promise.resolve({
              data: [
                {
                  id: 'doc-with-thumb',
                  storage_bucket: 'buildcore-documents',
                  thumbnail_storage_key: 'org/derivatives/doc/v1/thumb.webp',
                },
                {
                  id: 'doc-blank-key',
                  storage_bucket: null,
                  thumbnail_storage_key: '   ',
                },
              ],
              error: null,
            });
          },
        };
      },
    };

    const map = await loadCrmDocumentThumbnailSignedUrls({
      supabase: supabase as never,
      organizationId: 'org-1',
      documentIds: ['doc-with-thumb', 'doc-blank-key', 'doc-missing'],
      storage: {
        putObject: async () => undefined,
        deleteObject: async () => undefined,
        createSignedDownloadUrl: async (input) => {
          signedCalls.push(input);
          return `https://storage.example/sign/${input.storageKey}?token=t`;
        },
      },
    });

    assert.equal(map.size, 1);
    assert.equal(
      map.get('doc-with-thumb'),
      'https://storage.example/sign/org/derivatives/doc/v1/thumb.webp?token=t'
    );
    assert.equal(signedCalls.length, 1);
    assert.equal(signedCalls[0]?.expiresInSeconds, CRM_MEDIA_BROWSE_SIGNED_URL_TTL_SECONDS);
  });

  it('swallows per-document sign failures so list still succeeds', async () => {
    const supabase = {
      from() {
        return {
          select() {
            return this;
          },
          eq() {
            return this;
          },
          in() {
            return this;
          },
          not() {
            return Promise.resolve({
              data: [
                {
                  id: 'ok',
                  storage_bucket: 'buildcore-documents',
                  thumbnail_storage_key: 'a/thumb.webp',
                },
                {
                  id: 'fail',
                  storage_bucket: 'buildcore-documents',
                  thumbnail_storage_key: 'b/thumb.webp',
                },
              ],
              error: null,
            });
          },
        };
      },
    };

    const map = await loadCrmDocumentThumbnailSignedUrls({
      supabase: supabase as never,
      organizationId: 'org-1',
      documentIds: ['ok', 'fail'],
      storage: {
        putObject: async () => undefined,
        deleteObject: async () => undefined,
        createSignedDownloadUrl: async (input) => {
          if (input.storageKey.startsWith('b/')) throw new Error('sign failed');
          return 'https://storage.example/ok.webp?token=1';
        },
      },
    });

    assert.equal(map.size, 1);
    assert.equal(map.get('ok'), 'https://storage.example/ok.webp?token=1');
    assert.equal(map.has('fail'), false);
  });
});
