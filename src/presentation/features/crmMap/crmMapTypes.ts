import type { CrmProjectSummary } from '@/domain/crm';

export type CrmMapCoordinates = {
  readonly latitude: number;
  readonly longitude: number;
};

export function hasValidProjectCoordinates(
  project: Pick<CrmProjectSummary, 'latitude' | 'longitude'>
): project is Pick<CrmProjectSummary, 'latitude' | 'longitude'> & CrmMapCoordinates {
  return (
    project.latitude != null &&
    project.longitude != null &&
    Number.isFinite(project.latitude) &&
    Number.isFinite(project.longitude) &&
    project.latitude >= -90 &&
    project.latitude <= 90 &&
    project.longitude >= -180 &&
    project.longitude <= 180
  );
}

/** Parent markers only — one pin per parent project with valid coordinates. */
export type CrmMapMarker = {
  readonly parentProjectId: string;
  readonly parentProjectSlug: string;
  readonly parentProjectName: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly addressLabel: string;
};

/**
 * Searchable/selectable map entry.
 * Subprojects locate via their parent's marker while keeping their own details.
 */
export type CrmMapSearchableProject = {
  readonly projectId: string;
  readonly projectSlug: string;
  readonly projectName: string;
  readonly parentProjectId: string;
  readonly parentProjectSlug: string;
  readonly parentProjectName: string;
  readonly isSubproject: boolean;
  readonly marker: CrmMapMarker;
  readonly summary: CrmProjectSummary;
  readonly searchHaystack: string;
};
