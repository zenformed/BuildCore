/**
 * Parse GET query params for Projects list v2 page/count routes.
 */

import {
  normalizeCrmProjectsListV2Request,
  type CrmProjectsListV2NormalizedRequest,
} from '@/domain/crm/projectsListV2';

function splitCsvParam(raw: string | null): string[] {
  if (raw == null || raw.trim() === '') return [];
  return raw
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

function collectListParam(searchParams: URLSearchParams, key: string): string[] {
  const all = searchParams.getAll(key);
  if (all.length === 0) return [];
  const out: string[] = [];
  for (const entry of all) {
    out.push(...splitCsvParam(entry));
  }
  return out;
}

export type ParsedCrmProjectsListV2Query =
  | {
      readonly ok: true;
      readonly request: CrmProjectsListV2NormalizedRequest;
      readonly cursor: string | null;
    }
  | { readonly ok: false; readonly message: string };

/**
 * Dashboard roots routes: view=roots only.
 * children_of_parent is rejected here (use Project-scoped subprojects/v2 routes).
 */
export function parseCrmProjectsListV2Query(
  searchParams: URLSearchParams
): ParsedCrmProjectsListV2Query {
  const viewRaw = searchParams.get('view')?.trim() || 'roots';
  if (viewRaw !== 'roots') {
    return {
      ok: false,
      message: 'Phase 1A supports view=roots only',
    };
  }

  const normalized = normalizeCrmProjectsListV2Request({
    view: 'roots',
    search: searchParams.get('search'),
    sort: searchParams.get('sort') ?? undefined,
    limit: searchParams.get('limit') ?? undefined,
    filters: {
      stageSlugs: collectListParam(searchParams, 'stageSlugs'),
      priorities: collectListParam(searchParams, 'priorities'),
      workflowTaskStatuses: collectListParam(searchParams, 'workflowTaskStatuses'),
      // Accepted for fingerprint stability; not applied in Phase 1A (dashboard no-op).
      assignedMemberIds: collectListParam(searchParams, 'assignedMemberIds'),
    },
  });

  if (!normalized.ok) {
    return { ok: false, message: normalized.message };
  }

  const cursorRaw = searchParams.get('cursor');
  const cursor =
    cursorRaw != null && cursorRaw.trim() !== '' ? cursorRaw.trim() : null;

  return { ok: true, request: normalized.request, cursor };
}

/**
 * Project-page Subprojects v2 routes.
 * Server supplies parentProjectId from slug resolution — never trust a client parent id.
 */
export function parseCrmProjectsListV2ChildrenQuery(
  searchParams: URLSearchParams,
  parentProjectId: string
): ParsedCrmProjectsListV2Query {
  const viewRaw = searchParams.get('view')?.trim();
  if (viewRaw != null && viewRaw !== '' && viewRaw !== 'children_of_parent') {
    return {
      ok: false,
      message: 'Project subprojects v2 requires view=children_of_parent',
    };
  }

  // Ignore any client-supplied parentProjectId; bind the resolved parent only.
  const normalized = normalizeCrmProjectsListV2Request({
    view: 'children_of_parent',
    parentProjectId,
    search: searchParams.get('search'),
    sort: searchParams.get('sort') ?? undefined,
    limit: searchParams.get('limit') ?? undefined,
    filters: {
      stageSlugs: collectListParam(searchParams, 'stageSlugs'),
      priorities: collectListParam(searchParams, 'priorities'),
      workflowTaskStatuses: collectListParam(searchParams, 'workflowTaskStatuses'),
      assignedMemberIds: collectListParam(searchParams, 'assignedMemberIds'),
    },
  });

  if (!normalized.ok) {
    return { ok: false, message: normalized.message };
  }

  const cursorRaw = searchParams.get('cursor');
  const cursor =
    cursorRaw != null && cursorRaw.trim() !== '' ? cursorRaw.trim() : null;

  return { ok: true, request: normalized.request, cursor };
}
