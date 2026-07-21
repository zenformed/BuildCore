import type { CrmDocumentMetadata } from './document';

export type CrmOrganizationPhoto = {
  readonly document: CrmDocumentMetadata;
  readonly projectId: string;
  readonly projectSlug: string;
  readonly projectName: string;
  readonly parentProjectId: string | null;
  readonly parentProjectSlug: string | null;
  readonly parentProjectName: string | null;
  readonly taskName: string | null;
  readonly customerName: string | null;
  readonly canDownload: boolean;
  readonly canDelete: boolean;
};

export type CrmOrganizationPhotosPage = {
  readonly photos: readonly CrmOrganizationPhoto[];
  readonly nextCursor: string | null;
};
