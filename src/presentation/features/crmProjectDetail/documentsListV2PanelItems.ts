/**
 * Compose Documents tab list items for v2:
 * - Document rows come from the paginated API (not project.documents)
 * - Missing-required stubs still use embedded project tasks/budget + project.documents
 *   for completeness detection until attachment surfaces migrate (Phase 1A duplication).
 */

import type { CrmProjectDetail } from '@/domain/crm';
import type { CrmDocumentListItemV2 } from '@/domain/crm/documentsListV2';
import type { PipelineStage } from '@/domain/crm/pipelineStage';
import {
  buildDocumentPanelSourcesFromProject,
  filterDocumentPanelItems,
  type DocumentListItem,
  type DocumentPanelFilter,
} from './documentPanelModel';
import { filterDocumentPanelItemsBySearch } from './projectSectionSearchModel';

export function buildCrmDocumentsListV2PanelItems(input: {
  readonly project: CrmProjectDetail;
  readonly paginatedDocuments: readonly CrmDocumentListItemV2[];
  readonly filter: DocumentPanelFilter;
  readonly searchQuery: string;
  readonly stageCatalog: readonly PipelineStage[] | null;
}): DocumentListItem[] {
  const documentItems: DocumentListItem[] = input.paginatedDocuments.map((document) => ({
    kind: 'document' as const,
    document,
  }));

  const missingItems = filterDocumentPanelItemsBySearch(
    filterDocumentPanelItems(buildDocumentPanelSourcesFromProject(input.project), 'missing'),
    input.searchQuery,
    input.stageCatalog
  );

  if (input.filter === 'missing') {
    return missingItems;
  }
  if (input.filter === 'uploaded') {
    return documentItems;
  }
  return [...documentItems, ...missingItems];
}
