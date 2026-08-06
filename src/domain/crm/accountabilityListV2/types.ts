import type { CrmAccountabilityAction } from '../accountability';

export const CRM_ACCOUNTABILITY_LIST_V2_PAGE_SIZES = [25, 50] as const;
export type CrmAccountabilityListV2PageSize =
  (typeof CRM_ACCOUNTABILITY_LIST_V2_PAGE_SIZES)[number];

export const CRM_ACCOUNTABILITY_LIST_V2_DEFAULT_PAGE_SIZE: CrmAccountabilityListV2PageSize = 25;

export const CRM_ACCOUNTABILITY_LIST_V2_SEARCH_MIN_LENGTH = 2;

/** List row: existing Accountability UI fields plus DB event_type for future filters. */
export type CrmAccountabilityListItem = CrmAccountabilityAction & {
  readonly eventType: string;
};

export type CrmAccountabilityListV2NormalizedRequest = {
  readonly projectId: string;
  readonly search: string | null;
  readonly limit: CrmAccountabilityListV2PageSize;
  readonly fingerprint: string;
};

export type CrmAccountabilityListV2PageInfo = {
  readonly nextCursor: string | null;
  readonly hasNextPage: boolean;
};

export type CrmAccountabilityListV2PageResponse = {
  readonly items: readonly CrmAccountabilityListItem[];
  readonly pageInfo: CrmAccountabilityListV2PageInfo;
  readonly query: {
    readonly search: string | null;
    readonly fingerprint: string;
  };
  readonly meta: { readonly apiVersion: 2 };
};

export type CrmAccountabilityListV2CursorDirection = 'forward';
