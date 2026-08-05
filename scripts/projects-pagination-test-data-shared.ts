/**
 * Shared constants + safety gates for Projects list v2 pagination test data.
 * Development / local tooling only — not imported by the app runtime.
 */

import { config } from 'dotenv';
import path from 'node:path';
import { createCrmServiceRoleClient } from '../src/infrastructure/crm/server/createCrmServiceRoleClient';

config({ path: path.resolve(__dirname, '..', '.env.local'), quiet: true });
config({ path: path.resolve(__dirname, '..', '.env'), quiet: true });

/** Hard-pinned org for this developer test fixture. */
export const PAGINATION_TEST_ORG_ID = '1defbbdb-631c-487f-bcc2-b9cc27af9cf7';

/**
 * Machine-readable marker stored in `crm_projects.notes` and `crm_clients.notes`.
 * Cleanup requires this exact value (never name-only deletes).
 */
export const PAGINATION_TEST_MARKER = 'BUILDCORE_PAGINATION_TEST_DATA';

export const PAGINATION_TEST_PROJECT_COUNT = 120;

export const ALLOW_ENV_KEY = 'ALLOW_BUILDCORE_PAGINATION_TEST_DATA';

export type PaginationTestLifecycle = 'urgent' | 'normal' | 'completed' | 'inactive';

export function formatPaginationTestProjectName(index: number): string {
  return `Pagination Test Project ${String(index).padStart(3, '0')}`;
}

export function formatPaginationTestProjectSlug(index: number): string {
  return `pagination-test-project-${String(index).padStart(3, '0')}`;
}

export function formatPaginationTestCompanyName(index: number): string {
  return `Pagination Test Co ${String(index).padStart(3, '0')}`;
}

export function formatPaginationTestContactName(index: number): string {
  return `Pagination Tester ${String(index).padStart(3, '0')}`;
}

export function formatPaginationTestEmail(index: number): string {
  return `pagetest${String(index).padStart(3, '0')}@example.test`;
}

/** 10-digit US-style test numbers 5550100001–5550100120 */
export function formatPaginationTestPhone(index: number): string {
  return `555010${String(index).padStart(4, '0')}`;
}

/** Lifecycle buckets of 30 for operational ordering coverage. */
export function lifecycleForIndex(index: number): PaginationTestLifecycle {
  if (index <= 30) return 'urgent';
  if (index <= 60) return 'normal';
  if (index <= 90) return 'completed';
  return 'inactive';
}

/**
 * Spread last_activity_at within each lifecycle group.
 * Every three consecutive indexes share the same timestamp (id tie-breaker).
 */
export function lastActivityAtForIndex(index: number): string {
  const lifecycle = lifecycleForIndex(index);
  const groupBase = {
    urgent: Date.UTC(2026, 5, 1, 12, 0, 0),
    normal: Date.UTC(2026, 4, 1, 12, 0, 0),
    completed: Date.UTC(2026, 3, 1, 12, 0, 0),
    inactive: Date.UTC(2026, 2, 1, 12, 0, 0),
  }[lifecycle];
  const offsetInGroup = (index - 1) % 30;
  const sharedSlot = Math.floor(offsetInGroup / 3);
  return new Date(groupBase - sharedSlot * 3_600_000).toISOString();
}

export function assertPaginationTestDataSafety(action: 'seed' | 'cleanup'): void {
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      `Refusing to ${action} pagination test data while NODE_ENV=production.`
    );
  }

  if (process.env[ALLOW_ENV_KEY] !== 'true') {
    throw new Error(
      [
        `Refusing to ${action} pagination test data.`,
        `Set ${ALLOW_ENV_KEY}=true to confirm this is intentional development tooling.`,
        `Example: ${ALLOW_ENV_KEY}=true npm run testdata:projects-pagination:${action === 'seed' ? 'seed' : 'cleanup'}`,
      ].join('\n')
    );
  }

  if (!PAGINATION_TEST_MARKER || PAGINATION_TEST_MARKER.trim() === '') {
    throw new Error('Refusing to run: pagination test marker is absent.');
  }

  if (!PAGINATION_TEST_ORG_ID || PAGINATION_TEST_ORG_ID.trim() === '') {
    throw new Error('Refusing to run: pagination test organization UUID is absent.');
  }

  const uuidRe =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRe.test(PAGINATION_TEST_ORG_ID)) {
    throw new Error(`Refusing to run: invalid organization UUID "${PAGINATION_TEST_ORG_ID}".`);
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
