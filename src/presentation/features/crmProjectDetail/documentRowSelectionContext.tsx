'use client';

import {
  createContext,
  useContext,
  useMemo,
  type ReactElement,
  type ReactNode,
} from 'react';
import type { CrmDocumentMetadata } from '@/domain/crm';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import type { BulkSelectionBindings } from '@/presentation/features/bulkSelection/BulkSelectionBindings';
import { useBulkSelection } from '@/presentation/features/bulkSelection/useBulkSelection';

export type DocumentRowSelectionBulkActions = {
  readonly canDownload: boolean;
  readonly canDelete: boolean;
  readonly downloadableDocumentIds: ReadonlySet<string>;
  readonly documentsById: ReadonlyMap<string, CrmDocumentMetadata>;
  readonly onDeleteDocuments: (
    documentIds: readonly string[]
  ) => Promise<{ deletedCount: number; failedCount: number }>;
};

export type DocumentRowSelectionContextValue = BulkSelectionBindings & {
  readonly selectedCount: number;
  readonly clearSelection: () => void;
  readonly bulkActions: DocumentRowSelectionBulkActions | null;
};

const DocumentRowSelectionContext =
  createContext<DocumentRowSelectionContextValue | null>(null);

export function DocumentRowSelectionProvider({
  visibleDocumentIds,
  bulkActions = null,
  children,
}: {
  readonly visibleDocumentIds: readonly string[];
  readonly bulkActions?: DocumentRowSelectionBulkActions | null;
  readonly children: ReactNode;
}): ReactElement {
  const bulk = useBulkSelection<string>();
  const bulkCopy = content.bulkSelection;

  const value = useMemo<DocumentRowSelectionContextValue>(
    () => ({
      mode: true,
      selectedIds: bulk.selectedIds,
      selectedCount: bulk.selectedCount,
      clearSelection: bulk.clearSelection,
      onToggle: bulk.toggle,
      allVisibleSelected: bulk.allVisibleSelected(visibleDocumentIds),
      someVisibleSelected: bulk.someVisibleSelected(visibleDocumentIds),
      onToggleAllVisible: () => {
        if (bulk.allVisibleSelected(visibleDocumentIds)) {
          bulk.clearSelection();
        } else {
          bulk.selectAllVisible(visibleDocumentIds);
        }
      },
      selectItemAriaLabel: bulkCopy.selectItemAriaLabel,
      selectAllAriaLabel: bulkCopy.selectAllAriaLabel,
      bulkActions,
    }),
    [bulk, bulkActions, bulkCopy.selectAllAriaLabel, bulkCopy.selectItemAriaLabel, visibleDocumentIds]
  );

  return (
    <DocumentRowSelectionContext.Provider value={value}>
      {children}
    </DocumentRowSelectionContext.Provider>
  );
}

export function useDocumentRowSelection(): DocumentRowSelectionContextValue | null {
  return useContext(DocumentRowSelectionContext);
}
