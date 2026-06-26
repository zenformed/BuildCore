'use client';

import type { ReactElement, ReactNode } from 'react';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { CrmTeamMemberRef } from '@/domain/crm';

export const WORKFLOW_TASK_ASSIGNEE_DRAG_MIME = 'application/x-buildcore-workflow-assignee';

export function isWorkflowTaskAssigneeDragEvent(event: {
  dataTransfer: DataTransfer | null;
}): boolean {
  const transfer = event.dataTransfer;
  if (!transfer) return false;
  return Array.from(transfer.types).includes(WORKFLOW_TASK_ASSIGNEE_DRAG_MIME);
}

export function setWorkflowTaskAssigneeDragData(
  transfer: DataTransfer,
  member: CrmTeamMemberRef
): void {
  transfer.setData(WORKFLOW_TASK_ASSIGNEE_DRAG_MIME, member.id);
  transfer.setData('text/plain', member.displayName);
  transfer.effectAllowed = 'copy';
}

export function readWorkflowTaskAssigneeIdFromDragEvent(
  event: { dataTransfer: DataTransfer | null }
): string | null {
  const transfer = event.dataTransfer;
  if (!transfer) return null;
  const memberId = transfer.getData(WORKFLOW_TASK_ASSIGNEE_DRAG_MIME).trim();
  return memberId || null;
}

type WorkflowTaskAssigneeDragContextValue = {
  readonly draggedMember: CrmTeamMemberRef | null;
  readonly setDraggedMember: (member: CrmTeamMemberRef | null) => void;
};

const WorkflowTaskAssigneeDragContext = createContext<WorkflowTaskAssigneeDragContextValue | null>(
  null
);

export function useWorkflowTaskAssigneeDrag(): WorkflowTaskAssigneeDragContextValue {
  const value = useContext(WorkflowTaskAssigneeDragContext);
  if (value == null) {
    throw new Error('useWorkflowTaskAssigneeDrag must be used within WorkflowTaskAssigneeDragProvider');
  }
  return value;
}

export function useOptionalWorkflowTaskAssigneeDrag(): WorkflowTaskAssigneeDragContextValue | null {
  return useContext(WorkflowTaskAssigneeDragContext);
}

export type WorkflowTaskAssigneeDragProviderProps = {
  readonly children: ReactNode;
};

export function WorkflowTaskAssigneeDragProvider({
  children,
}: WorkflowTaskAssigneeDragProviderProps): ReactElement {
  const [draggedMember, setDraggedMember] = useState<CrmTeamMemberRef | null>(null);

  useEffect(() => {
    const onDragOver = (event: globalThis.DragEvent) => {
      if (!isWorkflowTaskAssigneeDragEvent(event)) return;
      event.preventDefault();
    };

    document.addEventListener('dragover', onDragOver);
    return () => document.removeEventListener('dragover', onDragOver);
  }, []);

  const value = useMemo(
    () => ({
      draggedMember,
      setDraggedMember,
    }),
    [draggedMember]
  );

  return (
    <WorkflowTaskAssigneeDragContext.Provider value={value}>
      {children}
    </WorkflowTaskAssigneeDragContext.Provider>
  );
}
