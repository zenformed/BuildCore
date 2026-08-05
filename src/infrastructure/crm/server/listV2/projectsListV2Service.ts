/**
 * Permanent service boundaries for Projects/Subprojects list v2.
 *
 * Phase 0: contracts + not-yet-wired implementations.
 * Do not call these from UI yet. Do not implement in-memory full-org slicing here.
 */

import type { CrmProjectSummary } from '@/domain/crm';
import type {
  CrmProjectsListV2CountResponse,
  CrmProjectsListV2NormalizedRequest,
  CrmProjectsListV2PageResponse,
  CrmProjectsListV2PageSummariesResponse,
} from '@/domain/crm/projectsListV2';
import type { SupabaseClient } from '@supabase/supabase-js';

export class CrmProjectsListV2NotWiredError extends Error {
  constructor(operation: string) {
    super(
      `Projects list v2 "${operation}" is not wired yet (Phase 0). Use v1 endpoints until Phase 1.`
    );
    this.name = 'CrmProjectsListV2NotWiredError';
  }
}

export type CrmProjectsListV2ListContext = {
  readonly supabase: SupabaseClient;
  readonly organizationId: string;
  readonly userId: string;
  readonly request: CrmProjectsListV2NormalizedRequest;
  readonly cursor?: string | null;
  readonly signal?: AbortSignal;
};

export type CrmProjectsListV2CountContext = {
  readonly supabase: SupabaseClient;
  readonly organizationId: string;
  readonly userId: string;
  readonly request: CrmProjectsListV2NormalizedRequest;
  readonly signal?: AbortSignal;
};

export type CrmProjectsListV2SummariesContext = {
  readonly supabase: SupabaseClient;
  readonly organizationId: string;
  readonly userId: string;
  readonly projectIds: readonly string[];
  readonly signal?: AbortSignal;
};

/**
 * Paginated root Projects (dashboard). Future: Postgres RPC keyset + visibility.
 */
export async function listCrmRootProjectsPageV2(
  _context: CrmProjectsListV2ListContext
): Promise<CrmProjectsListV2PageResponse<CrmProjectSummary>> {
  throw new CrmProjectsListV2NotWiredError('listCrmRootProjectsPageV2');
}

/**
 * Paginated Subprojects for one parent Project. Future: Postgres RPC keyset + visibility.
 */
export async function listCrmChildProjectsPageV2(
  _context: CrmProjectsListV2ListContext
): Promise<CrmProjectsListV2PageResponse<CrmProjectSummary>> {
  throw new CrmProjectsListV2NotWiredError('listCrmChildProjectsPageV2');
}

/**
 * Filtered count for the same normalized request (cached independently in Phase 1).
 */
export async function countCrmProjectsListV2(
  _context: CrmProjectsListV2CountContext
): Promise<CrmProjectsListV2CountResponse> {
  throw new CrmProjectsListV2NotWiredError('countCrmProjectsListV2');
}

/**
 * Page-scoped rollup summaries for visible project IDs only (never org-wide).
 */
export async function loadCrmProjectsPageSummariesV2(
  _context: CrmProjectsListV2SummariesContext
): Promise<CrmProjectsListV2PageSummariesResponse> {
  throw new CrmProjectsListV2NotWiredError('loadCrmProjectsPageSummariesV2');
}
