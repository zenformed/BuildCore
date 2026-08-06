import type { CrmDocumentMetadata } from '../document';

export const CRM_DOCUMENTS_LIST_V2_PAGE_SIZES = [25, 50] as const;
export type CrmDocumentsListV2PageSize = (typeof CRM_DOCUMENTS_LIST_V2_PAGE_SIZES)[number];

export const CRM_DOCUMENTS_LIST_V2_DEFAULT_PAGE_SIZE: CrmDocumentsListV2PageSize = 25;

export const CRM_DOCUMENTS_LIST_V2_SEARCH_MIN_LENGTH = 2;

/** Max explicit document IDs accepted by bulk ZIP / bulk delete in Phase 1A. */
export const CRM_DOCUMENTS_LIST_V2_BULK_MAX_IDS = 100;

/**
 * List row for Documents tab v2.
 * Same metadata shape the Documents table/gallery already uses — no signed URLs or bytes.
 * Includes image MIME types (Documents tab is not Photos-filtered).
 */
export type CrmDocumentListItemV2 = CrmDocumentMetadata;

export type CrmDocumentsListV2NormalizedRequest = {
  readonly projectId: string;
  readonly search: string | null;
  readonly limit: CrmDocumentsListV2PageSize;
  readonly fingerprint: string;
};

export type CrmDocumentsListV2PageInfo = {
  readonly nextCursor: string | null;
  readonly hasNextPage: boolean;
};

export type CrmDocumentsListV2PageResponse = {
  readonly items: readonly CrmDocumentListItemV2[];
  readonly pageInfo: CrmDocumentsListV2PageInfo;
  readonly query: {
    readonly search: string | null;
    readonly fingerprint: string;
  };
  readonly meta: { readonly apiVersion: 2 };
};

export type CrmDocumentsListV2CursorDirection = 'forward';
