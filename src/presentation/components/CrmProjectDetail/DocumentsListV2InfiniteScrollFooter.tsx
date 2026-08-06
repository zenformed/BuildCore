'use client';

import type { ReactElement } from 'react';
import {
  ListV2InfiniteScrollFooter,
  type ListV2InfiniteScrollFooterProps,
} from '@/presentation/components/crmShared/ListV2InfiniteScrollFooter';

export type DocumentsListV2InfiniteScrollFooterProps = ListV2InfiniteScrollFooterProps;

/** Documents tab wrapper around the shared list-v2 infinite-scroll footer. */
export function DocumentsListV2InfiniteScrollFooter(
  props: DocumentsListV2InfiniteScrollFooterProps
): ReactElement | null {
  return <ListV2InfiniteScrollFooter {...props} />;
}
