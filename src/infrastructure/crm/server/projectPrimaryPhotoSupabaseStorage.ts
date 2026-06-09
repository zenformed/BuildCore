import type { SupabaseClient } from '@supabase/supabase-js';
import { BUILDCORE_PROJECT_PHOTO_BUCKET } from '@/domain/crm/projectPrimaryPhoto';

export async function uploadProjectPrimaryPhotoObject(
  supabase: SupabaseClient,
  storageKey: string,
  body: Uint8Array,
  mimeType: string
): Promise<void> {
  const { error } = await supabase.storage
    .from(BUILDCORE_PROJECT_PHOTO_BUCKET)
    .upload(storageKey, body, { contentType: mimeType, upsert: true });
  if (error != null) {
    throw new Error(`storage_upload_failed: ${error.message}`);
  }
}

export async function downloadProjectPrimaryPhotoObject(
  supabase: SupabaseClient,
  storageKey: string
): Promise<{ buffer: Buffer; contentType: string } | null> {
  const { data, error } = await supabase.storage
    .from(BUILDCORE_PROJECT_PHOTO_BUCKET)
    .download(storageKey);
  if (error != null || data == null) {
    return null;
  }
  const buffer = Buffer.from(await data.arrayBuffer());
  return {
    buffer,
    contentType: data.type.trim() !== '' ? data.type : 'application/octet-stream',
  };
}

export async function deleteProjectPrimaryPhotoObject(
  supabase: SupabaseClient,
  storageKey: string
): Promise<void> {
  const { error } = await supabase.storage.from(BUILDCORE_PROJECT_PHOTO_BUCKET).remove([storageKey]);
  if (error != null) {
    const msg = error.message.toLowerCase();
    if (msg.includes('not found') || msg.includes('404')) {
      return;
    }
    throw new Error(`storage_delete_failed: ${error.message}`);
  }
}
