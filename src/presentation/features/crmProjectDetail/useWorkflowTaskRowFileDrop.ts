'use client';

import type { DragEvent } from 'react';
import { useCallback, useState } from 'react';
import type { CrmWorkflowTask } from '@/domain/crm';
import {
  isWorkflowTaskFileDragEvent,
  useWorkflowTaskFileDrag,
} from './workflowTaskFileDragContext';

export function useWorkflowTaskRowFileDrop(task: CrmWorkflowTask): {
  rowDragOver: boolean;
  rowDropHandlers: {
    onDragOver: (event: DragEvent<HTMLDivElement>) => void;
    onDragLeave: (event: DragEvent<HTMLDivElement>) => void;
    onDrop: (event: DragEvent<HTMLDivElement>) => void;
  };
} {
  const { onTaskDocumentDrop } = useWorkflowTaskFileDrag();
  const [rowDragOver, setRowDragOver] = useState(false);

  const onDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    if (!isWorkflowTaskFileDragEvent(event)) return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = 'copy';
    setRowDragOver(true);
  }, []);

  const onDragLeave = useCallback((event: DragEvent<HTMLDivElement>) => {
    if (!isWorkflowTaskFileDragEvent(event)) return;
    const related = event.relatedTarget;
    if (related instanceof Node && event.currentTarget.contains(related)) return;
    setRowDragOver(false);
  }, []);

  const onDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      setRowDragOver(false);
      const file = event.dataTransfer.files?.[0];
      if (!file) return;
      onTaskDocumentDrop(task, file);
    },
    [onTaskDocumentDrop, task]
  );

  return {
    rowDragOver,
    rowDropHandlers: { onDragOver, onDragLeave, onDrop },
  };
}
