import type { CrmProjectsListV2NormalizedRequest } from '@/domain/crm/projectsListV2';

/**
 * Stable TanStack Query keys for Projects list v2.
 * Only serializable normalized fields — never Set/Map/functions.
 * Shape: [scope, organizationId, kind, ...] so org prefix invalidation works.
 */

export const CRM_PROJECTS_LIST_V2_QUERY_SCOPE = 'crmProjectsListV2' as const;

export function crmProjectsListV2PageQueryKey(input: {
  readonly organizationId: string;
  readonly request: CrmProjectsListV2NormalizedRequest;
  readonly cursor: string | null;
}): readonly unknown[] {
  return [
    CRM_PROJECTS_LIST_V2_QUERY_SCOPE,
    input.organizationId,
    'page',
    input.request.view,
    input.request.parentProjectId,
    input.request.sort,
    input.request.limit,
    input.request.fingerprint,
    input.cursor,
  ] as const;
}

export function crmProjectsListV2CountQueryKey(input: {
  readonly organizationId: string;
  readonly request: CrmProjectsListV2NormalizedRequest;
}): readonly unknown[] {
  return [
    CRM_PROJECTS_LIST_V2_QUERY_SCOPE,
    input.organizationId,
    'count',
    input.request.view,
    input.request.parentProjectId,
    input.request.sort,
    input.request.limit,
    input.request.fingerprint,
  ] as const;
}

export function crmProjectsListV2SummariesQueryKey(input: {
  readonly organizationId: string;
  readonly projectIds: readonly string[];
}): readonly unknown[] {
  const sortedIds = [...input.projectIds].sort((a, b) => a.localeCompare(b));
  return [
    CRM_PROJECTS_LIST_V2_QUERY_SCOPE,
    input.organizationId,
    'summaries',
    sortedIds,
  ] as const;
}

/** Invalidate all v2 list queries for an organization after mutations. */
export function crmProjectsListV2OrgQueryKeyPrefix(
  organizationId: string
): readonly unknown[] {
  return [CRM_PROJECTS_LIST_V2_QUERY_SCOPE, organizationId] as const;
}
