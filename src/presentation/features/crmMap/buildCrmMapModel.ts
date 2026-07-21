import type { CrmProjectSummary } from '@/domain/crm';
import { formatCrmProjectAddressLine } from '@/domain/crm/projectAddress';
import { buildCrmProjectSummarySearchHaystack } from '@/domain/crm/projectSummarySearch';
import {
  hasValidProjectCoordinates,
  type CrmMapMarker,
  type CrmMapSearchableProject,
} from './crmMapTypes';

function resolveParentSummary(
  project: CrmProjectSummary,
  byId: ReadonlyMap<string, CrmProjectSummary>
): CrmProjectSummary | null {
  if (project.parentProjectId == null) return project;
  return byId.get(project.parentProjectId) ?? null;
}

/**
 * Build parent-only markers and searchable entries.
 * Subprojects without their own coordinates still appear in search when the parent has coordinates.
 */
export function buildCrmMapModel(
  summaries: readonly CrmProjectSummary[]
): {
  readonly markers: readonly CrmMapMarker[];
  readonly searchable: readonly CrmMapSearchableProject[];
} {
  const byId = new Map(summaries.map((summary) => [summary.id, summary] as const));
  const markers: CrmMapMarker[] = [];
  const markerByParentId = new Map<string, CrmMapMarker>();

  for (const summary of summaries) {
    if (summary.parentProjectId != null) continue;
    if (!hasValidProjectCoordinates(summary)) continue;
    const marker: CrmMapMarker = {
      parentProjectId: summary.id,
      parentProjectSlug: summary.slug,
      parentProjectName: summary.name,
      latitude: summary.latitude,
      longitude: summary.longitude,
      addressLabel: formatCrmProjectAddressLine(summary.address) || '—',
    };
    markers.push(marker);
    markerByParentId.set(summary.id, marker);
  }

  const searchable: CrmMapSearchableProject[] = [];
  for (const summary of summaries) {
    const parent = resolveParentSummary(summary, byId);
    if (parent == null) continue;
    const marker = markerByParentId.get(parent.id);
    if (marker == null) continue;

    const isSubproject = summary.parentProjectId != null;
    const parentName = parent.name;
    const haystack = [
      buildCrmProjectSummarySearchHaystack(summary),
      parentName,
      parent.client.name,
      isSubproject ? summary.name : '',
      marker.addressLabel,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    searchable.push({
      projectId: summary.id,
      projectSlug: summary.slug,
      projectName: summary.name,
      parentProjectId: parent.id,
      parentProjectSlug: parent.slug,
      parentProjectName: parent.name,
      isSubproject,
      marker,
      summary,
      searchHaystack: haystack,
    });
  }

  markers.sort((a, b) => a.parentProjectName.localeCompare(b.parentProjectName));
  searchable.sort((a, b) => a.projectName.localeCompare(b.projectName));

  return { markers, searchable };
}

export function filterCrmMapSearchableProjects(
  items: readonly CrmMapSearchableProject[],
  query: string
): readonly CrmMapSearchableProject[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return items;
  return items.filter((item) => item.searchHaystack.includes(normalized));
}
