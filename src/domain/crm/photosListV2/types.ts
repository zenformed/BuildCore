import type { CrmDocumentMetadata } from '../document';

/** Preserve current Photos page size (40) plus shared list-v2 sizes. */
export const CRM_PHOTOS_LIST_V2_PAGE_SIZES = [25, 40, 50] as const;
export type CrmPhotosListV2PageSize = (typeof CRM_PHOTOS_LIST_V2_PAGE_SIZES)[number];

export const CRM_PHOTOS_LIST_V2_DEFAULT_PAGE_SIZE: CrmPhotosListV2PageSize = 40;

export const CRM_PHOTOS_LIST_V2_SEARCH_MIN_LENGTH = 2;

/** Max explicit photo IDs accepted by bulk ZIP / bulk delete. */
export const CRM_PHOTOS_LIST_V2_BULK_MAX_IDS = 100;

/**
 * Organization-wide Photos list v2 row.
 * `thumbnailUrl` is a short-lived signed Storage URL for the durable thumbnail
 * derivative when ready; otherwise null (tiles fall back via browse API).
 */
export type CrmPhotoListItemV2 = {
  readonly id: string;
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
  readonly thumbnailUrl: string | null;
};

export type CrmPhotosListV2NormalizedRequest = {
  readonly organizationId: string;
  readonly search: string | null;
  readonly limit: CrmPhotosListV2PageSize;
  readonly fingerprint: string;
};

export type CrmPhotosListV2PageInfo = {
  readonly nextCursor: string | null;
  readonly hasNextPage: boolean;
};

export type CrmPhotosListV2PageResponse = {
  readonly items: readonly CrmPhotoListItemV2[];
  readonly pageInfo: CrmPhotosListV2PageInfo;
  readonly query: {
    readonly search: string | null;
    readonly fingerprint: string;
  };
  readonly meta: { readonly apiVersion: 2 };
};

export type CrmPhotosListV2CursorDirection = 'forward';
