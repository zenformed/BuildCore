import { initialsFromPersonName } from '@/domain/crm/teamMemberDisplay';

export const BUILDCORE_PROJECT_PHOTO_BUCKET = 'buildcore-project-photos';
export const BUILDCORE_PROJECT_PHOTO_MAX_BYTES = 2 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export type ProjectPrimaryPhotoUploadInput = {
  readonly size: number;
  readonly type: string;
  readonly name: string;
};

export function buildProjectPrimaryPhotoStorageKey(
  organizationId: string,
  projectId: string,
  fileName: string,
  uniqueToken: string = String(Date.now())
): string {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'photo';
  return `buildcore/${organizationId}/projects/${projectId}/primary/${uniqueToken}-${safeName}`;
}

export function normalizeProjectPrimaryPhotoMimeType(type: string, fileName: string): string | null {
  const normalized = type.trim().toLowerCase();
  if (ALLOWED_MIME_TYPES.has(normalized)) return normalized;
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  return null;
}

export function validateProjectPrimaryPhotoUpload(input: ProjectPrimaryPhotoUploadInput): string | null {
  if (input.size <= 0) return 'Photo file is empty.';
  if (input.size > BUILDCORE_PROJECT_PHOTO_MAX_BYTES) {
    return 'Photo must be 2 MB or smaller.';
  }
  if (normalizeProjectPrimaryPhotoMimeType(input.type, input.name) == null) {
    return 'Photo must be JPEG, PNG, or WebP.';
  }
  return null;
}

/** Parent uses client name; subprojects use project name (e.g. 5E). */
export function projectPrimaryPhotoInitials(input: {
  readonly parentProjectId: string | null;
  readonly projectName: string;
  readonly clientName: string;
}): string {
  const label =
    input.parentProjectId != null ? input.projectName.trim() : input.clientName.trim();
  return initialsFromPersonName(label || input.projectName || input.clientName || '?');
}

export function projectPrimaryPhotoCircleColor(label: string): string {
  let hash = 0;
  for (let index = 0; index < label.length; index += 1) {
    hash = (hash * 31 + label.charCodeAt(index)) >>> 0;
  }
  return `hsl(${hash % 360}, 55%, 42%)`;
}
