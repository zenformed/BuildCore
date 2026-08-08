/**
 * Batch-mint short-lived signed thumbnail URLs for authorized document pages.
 * Used by Photos list v2 and Documents list v2 after ACL/list filtering.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { IDocumentStorageProvider } from '@/application/ports/storage/IDocumentStorageProvider';
import { BUILDCORE_DOCUMENT_STORAGE_BUCKET } from '@/domain/crm/documentUpload';
import { CRM_MEDIA_BROWSE_SIGNED_URL_TTL_SECONDS } from '@/domain/crm/mediaBrowse';

export async function loadCrmDocumentThumbnailSignedUrls(input: {
  readonly supabase: SupabaseClient;
  readonly organizationId: string;
  readonly documentIds: readonly string[];
  readonly storage: IDocumentStorageProvider | null;
}): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (input.storage == null || input.documentIds.length === 0) return map;

  const { data, error } = await input.supabase
    .from('crm_documents')
    .select('id, storage_bucket, thumbnail_storage_key')
    .eq('organization_id', input.organizationId)
    .in('id', [...input.documentIds])
    .not('thumbnail_storage_key', 'is', null);
  if (error != null) throw new Error(error.message);

  const rows = (data ?? []) as Array<{
    id: string;
    storage_bucket: string | null;
    thumbnail_storage_key: string | null;
  }>;

  await Promise.all(
    rows.map(async (row) => {
      const key = row.thumbnail_storage_key?.trim();
      if (!key) return;
      try {
        const url = await input.storage!.createSignedDownloadUrl({
          bucket: row.storage_bucket ?? BUILDCORE_DOCUMENT_STORAGE_BUCKET,
          storageKey: key,
          expiresInSeconds: CRM_MEDIA_BROWSE_SIGNED_URL_TTL_SECONDS,
        });
        map.set(row.id, url);
      } catch {
        /* leave null — tile browse fallback */
      }
    })
  );
  return map;
}
