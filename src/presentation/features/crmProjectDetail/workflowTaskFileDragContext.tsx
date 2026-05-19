'use client';

import type { ReactElement, ReactNode } from 'react';
import { createContext, useContext, useEffect, useMemo } from 'react';
import type { CrmWorkflowTask } from '@/domain/crm';

export function isWorkflowTaskFileDragEvent(event: {
  dataTransfer: DataTransfer | null;
}): boolean {
  const transfer = event.dataTransfer;
  if (!transfer) return false;

  const types = Array.from(transfer.types);
  if (types.includes('Files')) return true;
  if (types.some((type) => type === 'application/x-moz-file')) return true;

  try {
    if (transfer.items && transfer.items.length > 0) {
      return Array.from(transfer.items).some((item) => item.kind === 'file');
    }
  } catch {
    // dataTransfer.items can be inaccessible during drag in some browsers.
  }

  return false;
}

type WorkflowTaskFileDragContextValue = {
  onTaskDocumentDrop: (task: CrmWorkflowTask, file: File) => void;
};

const WorkflowTaskFileDragContext = createContext<WorkflowTaskFileDragContextValue | null>(null);

export function useWorkflowTaskFileDrag(): WorkflowTaskFileDragContextValue {
  const value = useContext(WorkflowTaskFileDragContext);
  if (value == null) {
    throw new Error('useWorkflowTaskFileDrag must be used within WorkflowTaskFileDragProvider');
  }
  return value;
}

export type WorkflowTaskFileDragProviderProps = {
  children: ReactNode;
  onTaskDocumentDrop: (task: CrmWorkflowTask, file: File) => void;
};

/**
 * Enables OS file drops in the browser and supplies the upload confirm callback to task rows.
 */
export function WorkflowTaskFileDragProvider({
  children,
  onTaskDocumentDrop,
}: WorkflowTaskFileDragProviderProps): ReactElement {
  useEffect(() => {
    const onDragOver = (event: DragEvent) => {
      if (!isWorkflowTaskFileDragEvent(event)) return;
      event.preventDefault();
    };

    document.addEventListener('dragover', onDragOver);
    return () => document.removeEventListener('dragover', onDragOver);
  }, []);

  const value = useMemo(() => ({ onTaskDocumentDrop }), [onTaskDocumentDrop]);

  return (
    <WorkflowTaskFileDragContext.Provider value={value}>
      {children}
    </WorkflowTaskFileDragContext.Provider>
  );
}
