/**
 * Documents list v2 infinite-scroll helpers — thin aliases over the shared list-v2 primitive.
 */

export {
  LIST_V2_INFINITE_SCROLL_ROOT_MARGIN as DOCUMENTS_LIST_V2_INFINITE_SCROLL_ROOT_MARGIN,
  flattenListV2PagesById as flattenDocumentsListV2PagesById,
  isIntersectionObserverAvailable,
  shouldFetchListV2NextPage as shouldFetchDocumentsListV2NextPage,
  shouldObserveListV2Sentinel as shouldObserveDocumentsListV2Sentinel,
} from '@/presentation/features/listV2/listV2InfiniteScroll';
