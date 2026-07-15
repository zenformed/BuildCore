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

export type WorkflowTaskRowSelectionContextValue = BulkSelectionBindings;

const WorkflowTaskRowSelectionContext =
  createContext<WorkflowTaskRowSelectionContextValue | null>(null);

export function WorkflowTaskRowSelectionProvider({
  visibleTaskIds,
  children,
}: {
  readonly visibleTaskIds: readonly string[];
  readonly children: ReactNode;
}): ReactElement {
  const bulk = useBulkSelection<string>();
  const bulkCopy = content.bulkSelection;

  const value = useMemo<WorkflowTaskRowSelectionContextValue>(
    () => ({
      mode: true,
      selectedIds: bulk.selectedIds,
      onToggle: bulk.toggle,
      allVisibleSelected: bulk.allVisibleSelected(visibleTaskIds),
      someVisibleSelected: bulk.someVisibleSelected(visibleTaskIds),
      onToggleAllVisible: () => {
        if (bulk.allVisibleSelected(visibleTaskIds)) {
          bulk.clearSelection();
        } else {
          bulk.selectAllVisible(visibleTaskIds);
        }
      },
      selectItemAriaLabel: bulkCopy.selectItemAriaLabel,
      selectAllAriaLabel: bulkCopy.selectAllAriaLabel,
    }),
    [bulk, bulkCopy.selectAllAriaLabel, bulkCopy.selectItemAriaLabel, visibleTaskIds]
  );

  return (
    <WorkflowTaskRowSelectionContext.Provider value={value}>
      {children}
    </WorkflowTaskRowSelectionContext.Provider>
  );
}

export function useWorkflowTaskRowSelection(): WorkflowTaskRowSelectionContextValue | null {
  return useContext(WorkflowTaskRowSelectionContext);
}
