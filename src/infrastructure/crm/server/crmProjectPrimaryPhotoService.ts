import type { SupabaseClient } from '@supabase/supabase-js';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import type { CrmProjectDetail } from '@/domain/crm';
import {
  BUILDCORE_PROJECT_PHOTO_BUCKET,
  buildProjectPrimaryPhotoStorageKey,
  normalizeProjectPrimaryPhotoMimeType,
  validateProjectPrimaryPhotoUpload,
} from '@/domain/crm/projectPrimaryPhoto';
import type { IDocumentStorageProvider } from '@/application/ports/storage/IDocumentStorageProvider';
import { getCrmDataSource } from '@/infrastructure/config/crmDataSource';
import { readMockStorageObject } from '@/infrastructure/storage/mock/mockStorageObjectStore';
import {
  getEffectiveMockProjectDetailBySlug,
  saveMockProjectDetail,
} from '@/infrastructure/crm/mock/mockCrmMutationStore';
import { getCrmProjectDetailBySlugForOrg } from './crmReadService';
import {
  deleteProjectPrimaryPhotoObject,
  downloadProjectPrimaryPhotoObject,
  uploadProjectPrimaryPhotoObject,
} from './projectPrimaryPhotoSupabaseStorage';

type ProjectPhotoRow = {
  id: string;
  slug: string;
  primary_photo_path: string | null;
};

function contentTypeFromFilename(fileName: string): string | null {
  const ext = path.extname(fileName).toLowerCase();
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  return null;
}

async function tryReadPublicDemoPhoto(
  primaryPhotoPath: string
): Promise<{ buffer: Buffer; contentType: string } | null> {
  const trimmed = primaryPhotoPath.trim();
  if (trimmed === '') return null;
  const withoutPrefix = trimmed.startsWith('/')
    ? trimmed.slice(1)
    : trimmed;
  if (!withoutPrefix.startsWith('images/')) return null;
  const normalized = path.posix.normalize(withoutPrefix);
  if (!normalized.startsWith('images/') || normalized.includes('..')) return null;
  const filePath = path.join(process.cwd(), 'public', normalized);
  try {
    const body = await fs.readFile(filePath);
    const contentType = contentTypeFromFilename(normalized);
    if (contentType == null) return null;
    return { buffer: body, contentType };
  } catch {
    return null;
  }
}

async function loadProjectPhotoRow(
  supabase: SupabaseClient,
  organizationId: string,
  slug: string
): Promise<ProjectPhotoRow | null> {
  const { data, error } = await supabase
    .from('crm_projects')
    .select('id, slug, primary_photo_path')
    .eq('organization_id', organizationId)
    .eq('slug', slug)
    .is('archived_at', null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as ProjectPhotoRow | null) ?? null;
}

async function setProjectPrimaryPhotoPath(
  supabase: SupabaseClient,
  organizationId: string,
  projectId: string,
  primaryPhotoPath: string | null
): Promise<void> {
  const { error } = await supabase
    .from('crm_projects')
    .update({ primary_photo_path: primaryPhotoPath })
    .eq('organization_id', organizationId)
    .eq('id', projectId);

  if (error) throw new Error(error.message);
}

export async function downloadProjectPrimaryPhotoForOrg(
  supabase: SupabaseClient,
  organizationId: string,
  slug: string,
  _storage?: IDocumentStorageProvider
): Promise<{ buffer: Buffer; contentType: string } | null> {
  if (getCrmDataSource() === 'mock') {
    const detail = getEffectiveMockProjectDetailBySlug(slug);
    const path = detail?.summary.primaryPhotoPath;
    if (path == null) return null;
    const object = readMockStorageObject(BUILDCORE_PROJECT_PHOTO_BUCKET, path);
    if (object == null) {
      return tryReadPublicDemoPhoto(path);
    }
    return { buffer: object.body, contentType: object.mimeType };
  }

  const row = await loadProjectPhotoRow(supabase, organizationId, slug);
  if (row?.primary_photo_path == null) return null;
  return downloadProjectPrimaryPhotoObject(supabase, row.primary_photo_path);
}

export async function uploadProjectPrimaryPhotoForOrg(input: {
  supabase: SupabaseClient;
  organizationId: string;
  slug: string;
  fileName: string;
  mimeType: string;
  size: number;
  body: Uint8Array;
  storage?: IDocumentStorageProvider;
}): Promise<CrmProjectDetail | null> {
  const validationError = validateProjectPrimaryPhotoUpload({
    size: input.size,
    type: input.mimeType,
    name: input.fileName,
  });
  if (validationError != null) {
    throw new Error(validationError);
  }

  const normalizedMimeType = normalizeProjectPrimaryPhotoMimeType(input.mimeType, input.fileName);
  if (normalizedMimeType == null) {
    throw new Error('Photo must be JPEG, PNG, or WebP.');
  }

  if (getCrmDataSource() === 'mock') {
    if (input.storage == null) {
      throw new Error('mock_storage_required');
    }

    const existing = getEffectiveMockProjectDetailBySlug(input.slug);
    if (existing == null) return null;

    const storageKey = buildProjectPrimaryPhotoStorageKey(
      'mock-org',
      existing.summary.id,
      input.fileName
    );

    if (existing.summary.primaryPhotoPath != null) {
      await input.storage.deleteObject({
        bucket: BUILDCORE_PROJECT_PHOTO_BUCKET,
        storageKey: existing.summary.primaryPhotoPath,
      });
    }

    await input.storage.putObject({
      bucket: BUILDCORE_PROJECT_PHOTO_BUCKET,
      storageKey,
      mimeType: normalizedMimeType,
      body: input.body,
    });

    const updated: CrmProjectDetail = {
      ...existing,
      summary: {
        ...existing.summary,
        primaryPhotoPath: storageKey,
      },
    };
    saveMockProjectDetail(input.slug, updated);
    return updated;
  }

  const row = await loadProjectPhotoRow(input.supabase, input.organizationId, input.slug);
  if (row == null) return null;

  const storageKey = buildProjectPrimaryPhotoStorageKey(
    input.organizationId,
    row.id,
    input.fileName
  );

  if (row.primary_photo_path != null) {
    try {
      await deleteProjectPrimaryPhotoObject(input.supabase, row.primary_photo_path);
    } catch {
      // Best-effort cleanup before replace.
    }
  }

  await uploadProjectPrimaryPhotoObject(
    input.supabase,
    storageKey,
    input.body,
    normalizedMimeType
  );

  await setProjectPrimaryPhotoPath(input.supabase, input.organizationId, row.id, storageKey);
  return getCrmProjectDetailBySlugForOrg(input.supabase, input.organizationId, input.slug);
}

export async function removeProjectPrimaryPhotoForOrg(input: {
  supabase: SupabaseClient;
  organizationId: string;
  slug: string;
  storage?: IDocumentStorageProvider;
}): Promise<CrmProjectDetail | null> {
  if (getCrmDataSource() === 'mock') {
    if (input.storage == null) {
      throw new Error('mock_storage_required');
    }

    const existing = getEffectiveMockProjectDetailBySlug(input.slug);
    if (existing == null) return null;
    if (existing.summary.primaryPhotoPath != null) {
      await input.storage.deleteObject({
        bucket: BUILDCORE_PROJECT_PHOTO_BUCKET,
        storageKey: existing.summary.primaryPhotoPath,
      });
    }
    const updated: CrmProjectDetail = {
      ...existing,
      summary: {
        ...existing.summary,
        primaryPhotoPath: null,
      },
    };
    saveMockProjectDetail(input.slug, updated);
    return updated;
  }

  const row = await loadProjectPhotoRow(input.supabase, input.organizationId, input.slug);
  if (row == null) return null;

  if (row.primary_photo_path != null) {
    try {
      await deleteProjectPrimaryPhotoObject(input.supabase, row.primary_photo_path);
    } catch {
      // Best-effort cleanup.
    }
  }

  await setProjectPrimaryPhotoPath(input.supabase, input.organizationId, row.id, null);
  return getCrmProjectDetailBySlugForOrg(input.supabase, input.organizationId, input.slug);
}
