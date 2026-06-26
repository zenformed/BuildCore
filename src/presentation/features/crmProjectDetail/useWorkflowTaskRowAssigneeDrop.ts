'use client';

import type { DragEvent } from 'react';
import { useCallback, useState } from 'react';
import {
  isWorkflowTaskAssigneeDragEvent,
  readWorkflowTaskAssigneeIdFromDragEvent,
} from './workflowTaskAssigneeDragContext';

export function useWorkflowTaskRowAssigneeDrop(
  canAssign: boolean,
  onAssign: (memberId: string) => void
): {
  assigneeDragOver: boolean;
  assigneeDropHandlers: {
    onDragOver: (event: DragEvent<HTMLElement>) => void;
    onDragLeave: (event: DragEvent<HTMLElement>) => void;
    onDrop: (event: DragEvent<HTMLElement>) => void;
  };
} {
  const [assigneeDragOver, setAssigneeDragOver] = useState(false);

  const onDragOver = useCallback(
    (event: DragEvent<HTMLElement>) => {
      if (!canAssign || !isWorkflowTaskAssigneeDragEvent(event)) return;
      event.preventDefault();
      event.stopPropagation();
      event.dataTransfer.dropEffect = 'copy';
      setAssigneeDragOver(true);
    },
    [canAssign]
  );

  const onDragLeave = useCallback((event: DragEvent<HTMLElement>) => {
    if (!isWorkflowTaskAssigneeDragEvent(event)) return;
    const related = event.relatedTarget;
    if (related instanceof Node && event.currentTarget.contains(related)) return;
    setAssigneeDragOver(false);
  }, []);

  const onDrop = useCallback(
    (event: DragEvent<HTMLElement>) => {
      if (!canAssign || !isWorkflowTaskAssigneeDragEvent(event)) return;
      event.preventDefault();
      event.stopPropagation();
      setAssigneeDragOver(false);
      const memberId = readWorkflowTaskAssigneeIdFromDragEvent(event);
      if (!memberId) return;
      onAssign(memberId);
    },
    [canAssign, onAssign]
  );

  return {
    assigneeDragOver,
    assigneeDropHandlers: { onDragOver, onDragLeave, onDrop },
  };
}
