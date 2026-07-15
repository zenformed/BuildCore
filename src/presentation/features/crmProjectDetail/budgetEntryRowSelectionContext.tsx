'use client';

import {
  createContext,
  useContext,
  useMemo,
  type ReactElement,
  type ReactNode,
} from 'react';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import type { BulkSelectionBindings } from '@/presentation/features/bulkSelection/BulkSelectionBindings';
import { useBulkSelection } from '@/presentation/features/bulkSelection/useBulkSelection';

export type BudgetEntryRowSelectionBulkActions = {
  readonly canDelete: boolean;
  readonly onDeleteEntries: (
    entryIds: readonly string[]
  ) => Promise<{ deletedCount: number; failedCount: number }>;
};

export type BudgetEntryRowSelectionContextValue = BulkSelectionBindings & {
  readonly selectedCount: number;
  readonly clearSelection: () => void;
  readonly bulkActions: BudgetEntryRowSelectionBulkActions | null;
};

const BudgetEntryRowSelectionContext =
  createContext<BudgetEntryRowSelectionContextValue | null>(null);

export function BudgetEntryRowSelectionProvider({
  visibleEntryIds,
  bulkActions = null,
  children,
}: {
  readonly visibleEntryIds: readonly string[];
  readonly bulkActions?: BudgetEntryRowSelectionBulkActions | null;
  readonly children: ReactNode;
}): ReactElement {
  const bulk = useBulkSelection<string>();
  const bulkCopy = content.bulkSelection;

  const value = useMemo<BudgetEntryRowSelectionContextValue>(
    () => ({
      mode: true,
      selectedIds: bulk.selectedIds,
      selectedCount: bulk.selectedCount,
      clearSelection: bulk.clearSelection,
      onToggle: bulk.toggle,
      allVisibleSelected: bulk.allVisibleSelected(visibleEntryIds),
      someVisibleSelected: bulk.someVisibleSelected(visibleEntryIds),
      onToggleAllVisible: () => {
        if (bulk.allVisibleSelected(visibleEntryIds)) {
          bulk.clearSelection();
        } else {
          bulk.selectAllVisible(visibleEntryIds);
        }
      },
      selectItemAriaLabel: bulkCopy.selectItemAriaLabel,
      selectAllAriaLabel: bulkCopy.selectAllAriaLabel,
      bulkActions,
    }),
    [bulk, bulkActions, bulkCopy.selectAllAriaLabel, bulkCopy.selectItemAriaLabel, visibleEntryIds]
  );

  return (
    <BudgetEntryRowSelectionContext.Provider value={value}>
      {children}
    </BudgetEntryRowSelectionContext.Provider>
  );
}

export function useBudgetEntryRowSelection(): BudgetEntryRowSelectionContextValue | null {
  return useContext(BudgetEntryRowSelectionContext);
}
