/**
 * Eligible existing-parent candidates for spreadsheet import attach_existing.
 * Filters org-provided root summaries (caller must load same-org data).
 */

import {
  formatCrmProjectAddressLine,
  type CrmProjectAddress,
} from '@/domain/crm/projectAddress';
import type { CrmProjectSummary } from '@/domain/crm/project';
import { isCrmProjectInactive } from '@/domain/crm/subprojectStatus';

export type CrmImportParentCandidate = {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly clientName: string;
  /** Full address line for search / disambiguation. */
  readonly addressLabel: string;
  /** Compact city, state (or equivalent) for table display. */
  readonly locationLabel: string;
  readonly subprojectCount: number;
  readonly lastUpdatedAt: string;
  readonly searchHaystack: string;
};

export const CRM_IMPORT_PARENT_LIST_PAGE_SIZE = 8;

function buildAddressLabel(address: CrmProjectAddress): string {
  return formatCrmProjectAddressLine(address)?.trim() || '';
}

function buildLocationLabel(address: CrmProjectAddress): string {
  const city = address.city?.trim() || '';
  const state = address.state?.trim() || '';
  if (city && state) return `${city}, ${state}`;
  return city || state || '';
}

function buildHaystack(parts: readonly string[]): string {
  return parts
    .map((p) => p.trim().toLowerCase())
    .filter(Boolean)
    .join(' ');
}

export function toCrmImportParentCandidate(
  project: CrmProjectSummary,
  subprojectCount = 0
): CrmImportParentCandidate {
  const clientName = project.client.name?.trim() || '';
  const addressLabel = buildAddressLabel(project.address);
  const locationLabel = buildLocationLabel(project.address);
  return {
    id: project.id,
    slug: project.slug,
    name: project.name,
    clientName,
    addressLabel,
    locationLabel,
    subprojectCount,
    lastUpdatedAt: project.lastUpdatedAt,
    searchHaystack: buildHaystack([project.name, clientName, addressLabel, locationLabel]),
  };
}

function countSubprojectsByParentId(
  projects: readonly CrmProjectSummary[]
): ReadonlyMap<string, number> {
  const counts = new Map<string, number>();
  for (const project of projects) {
    if (project.parentProjectId == null) continue;
    counts.set(project.parentProjectId, (counts.get(project.parentProjectId) ?? 0) + 1);
  }
  return counts;
}

/**
 * Eligible attach targets: root, not archived (list already excludes archived),
 * not inactive, not a subproject.
 * Pass the org's project list (roots + children) so Subproject counts can be derived.
 * Sorted newest-updated first.
 */
export function filterEligibleImportParentProjects(
  projects: readonly CrmProjectSummary[]
): readonly CrmImportParentCandidate[] {
  const childCounts = countSubprojectsByParentId(projects);
  return projects
    .filter((p) => p.parentProjectId == null && !isCrmProjectInactive(p))
    .map((p) => toCrmImportParentCandidate(p, childCounts.get(p.id) ?? 0))
    .slice()
    .sort((a, b) => b.lastUpdatedAt.localeCompare(a.lastUpdatedAt));
}

export function searchImportParentCandidates(
  candidates: readonly CrmImportParentCandidate[],
  query: string,
  options?: { readonly limit?: number }
): readonly CrmImportParentCandidate[] {
  const limit = options?.limit ?? 40;
  const normalized = query.trim().toLowerCase();
  const filtered = !normalized
    ? candidates
    : candidates.filter((c) => c.searchHaystack.includes(normalized));
  return filtered.slice(0, limit);
}
