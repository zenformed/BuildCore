/**
 * Shared constants + safety gates for Photos list v2 pagination test data.
 * Development / local tooling only — not imported by the app runtime.
 */

import { config } from 'dotenv';
import path from 'node:path';
import { createCrmServiceRoleClient } from '../src/infrastructure/crm/server/createCrmServiceRoleClient';

config({ path: path.resolve(__dirname, '..', '.env.local'), quiet: true });
config({ path: path.resolve(__dirname, '..', '.env'), quiet: true });

/** Hard-pinned org for this developer test fixture (same org as Projects pagination fixtures). */
export const PHOTOS_PAGINATION_TEST_ORG_ID = '1defbbdb-631c-487f-bcc2-b9cc27af9cf7';

/**
 * Machine-readable marker stored in crm_documents.storage_key and crm_projects.notes.
 * Cleanup requires this exact value (never name-only deletes).
 */
export const PHOTOS_PAGINATION_TEST_MARKER = 'BUILDCORE_PHOTOS_PAGINATION_TEST_DATA';

export const PHOTOS_PAGINATION_TEST_PHOTO_COUNT = 200;

export const PHOTOS_PAGINATION_ALLOW_ENV_KEY = 'ALLOW_BUILDCORE_PHOTOS_PAGINATION_TEST_DATA';

export const PHOTOS_PAGINATION_STORAGE_KEY_PREFIX = `testdata/photos-pagination/${PHOTOS_PAGINATION_TEST_MARKER}`;

export function formatPhotosPaginationTestProjectName(kind: 'root-a' | 'root-b' | 'child'): string {
  switch (kind) {
    case 'root-a':
      return 'Photos Pagination Root A';
    case 'root-b':
      return 'Photos Pagination Root B';
    case 'child':
      return 'Photos Pagination Child';
  }
}

export function formatPhotosPaginationTestFileName(index: number, mime: 'image' | 'pdf'): string {
  const pad = String(index).padStart(3, '0');
  return mime === 'image'
    ? `photos-pagination-test-${pad}.jpg`
    : `photos-pagination-test-${pad}.pdf`;
}

export function createdAtForPhotosPaginationIndex(index: number): string {
  // Every three consecutive indexes share the same timestamp (id tie-breaker coverage).
  const sharedSlot = Math.floor((index - 1) / 3);
  const base = Date.UTC(2026, 6, 1, 12, 0, 0);
  return new Date(base - sharedSlot * 60_000).toISOString();
}

export function assertPhotosPaginationTestDataSafety(action: 'seed' | 'cleanup'): void {
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      `Refusing to ${action} photos pagination test data while NODE_ENV=production.`
    );
  }

  if (process.env[PHOTOS_PAGINATION_ALLOW_ENV_KEY] !== 'true') {
    throw new Error(
      [
        `Refusing to ${action} photos pagination test data.`,
        `Set ${PHOTOS_PAGINATION_ALLOW_ENV_KEY}=true to confirm this is intentional development tooling.`,
        `Example: ${PHOTOS_PAGINATION_ALLOW_ENV_KEY}=true npm run testdata:photos-pagination:${action === 'seed' ? 'seed' : 'cleanup'}`,
      ].join('\n')
    );
  }

  if (!PHOTOS_PAGINATION_TEST_MARKER || PHOTOS_PAGINATION_TEST_MARKER.trim() === '') {
    throw new Error('Refusing to run: photos pagination test marker is absent.');
  }

  const uuidRe =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRe.test(PHOTOS_PAGINATION_TEST_ORG_ID)) {
    throw new Error(
      `Refusing to run: invalid organization UUID "${PHOTOS_PAGINATION_TEST_ORG_ID}".`
    );
  }
}

export function requireCrmServiceRoleClient() {
  const supabase = createCrmServiceRoleClient();
  if (supabase == null) {
    throw new Error(
      [
        'FAIL: Supabase service role client unavailable.',
        'Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.',
      ].join('\n')
    );
  }
  return supabase;
}
