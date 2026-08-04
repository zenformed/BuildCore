import type { CrmProjectSummary } from '@/domain/crm';
import { formatCrmProjectLocationLine } from '@/domain/crm/projectAddress';
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

export function buildCrmMapModel(
  summaries: readonly CrmProjectSummary[]
): {
  readonly markers: readonly CrmMapMarker[];
  readonly searchable: readonly CrmMapSearchableProject[];
} {
  const byId = new Map(summaries.map((summary) => [summary.id, summary] as const));
  const markers: CrmMapMarker[] = [];
  const markerByProjectId = new Map<string, CrmMapMarker>();
  const markerByParentId = new Map<string, CrmMapMarker>();

  for (const summary of summaries) {
    if (!hasValidProjectCoordinates(summary)) continue;
    const parent = resolveParentSummary(summary, byId);
    if (parent == null) continue;
    const isSubproject = summary.parentProjectId != null;
    const marker: CrmMapMarker = {
      projectId: summary.id,
      projectSlug: summary.slug,
      projectName: summary.name,
      isSubproject,
      parentProjectId: parent.id,
      parentProjectSlug: parent.slug,
      parentProjectName: parent.name,
      latitude: summary.latitude,
      longitude: summary.longitude,
      addressLabel:
        formatCrmProjectLocationLine(summary.address, summary.latitude, summary.longitude) || '—',
    };
    markers.push(marker);
    markerByProjectId.set(summary.id, marker);
    if (parent.id === summary.id && !markerByParentId.has(parent.id)) {
      markerByParentId.set(parent.id, marker);
    }
  }

  const searchable: CrmMapSearchableProject[] = [];
  for (const summary of summaries) {
    const parent = resolveParentSummary(summary, byId);
    if (parent == null) continue;
    const marker = markerByProjectId.get(summary.id) ?? markerByParentId.get(parent.id);
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

  markers.sort(
    (a, b) =>
      a.parentProjectName.localeCompare(b.parentProjectName) ||
      Number(a.isSubproject) - Number(b.isSubproject) ||
      a.projectName.localeCompare(b.projectName)
  );
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
