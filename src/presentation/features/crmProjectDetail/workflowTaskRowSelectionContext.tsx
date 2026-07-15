'use client';

import {
  createContext,
  useContext,
  useMemo,
  type ReactElement,
  type ReactNode,
} from 'react';
import type { CrmWorkflowTask } from '@/domain/crm';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import type { BulkSelectionBindings } from '@/presentation/features/bulkSelection/BulkSelectionBindings';
import { useBulkSelection } from '@/presentation/features/bulkSelection/useBulkSelection';

export type WorkflowTaskRowSelectionBulkActions = {
  readonly canDelete: boolean;
  readonly canApprove: boolean;
  readonly canChangeNonDoneStatus: boolean;
  /** API + edit permission: notify-assigned is available for assigned tasks. */
  readonly canNotifyAssigned: boolean;
  readonly tasksById: ReadonlyMap<string, CrmWorkflowTask>;
  readonly docCountByTaskId: ReadonlyMap<string, number>;
  readonly onTaskUpdated: (task: CrmWorkflowTask) => Promise<void>;
};

export type WorkflowTaskRowSelectionContextValue = BulkSelectionBindings & {
  readonly selectedCount: number;
  readonly clearSelection: () => void;
  readonly bulkActions: WorkflowTaskRowSelectionBulkActions | null;
};

const WorkflowTaskRowSelectionContext =
  createContext<WorkflowTaskRowSelectionContextValue | null>(null);

export function WorkflowTaskRowSelectionProvider({
  visibleTaskIds,
  bulkActions = null,
  children,
}: {
  readonly visibleTaskIds: readonly string[];
  readonly bulkActions?: WorkflowTaskRowSelectionBulkActions | null;
  readonly children: ReactNode;
}): ReactElement {
  const bulk = useBulkSelection<string>();
  const bulkCopy = content.bulkSelection;

  const value = useMemo<WorkflowTaskRowSelectionContextValue>(
    () => ({
      mode: true,
      selectedIds: bulk.selectedIds,
      selectedCount: bulk.selectedCount,
      clearSelection: bulk.clearSelection,
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
      bulkActions,
    }),
    [bulk, bulkActions, bulkCopy.selectAllAriaLabel, bulkCopy.selectItemAriaLabel, visibleTaskIds]
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
