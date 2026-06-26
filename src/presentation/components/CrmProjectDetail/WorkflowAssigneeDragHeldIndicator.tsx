'use client';

import type { ReactElement } from 'react';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { useWorkflowTaskAssigneeDrag } from '@/presentation/features/crmProjectDetail/workflowTaskAssigneeDragContext';
import { TeamMemberAvatar } from './TeamMemberAvatar';
import styles from './ProjectDetail.module.css';

export function WorkflowAssigneeDragHeldIndicator(): ReactElement | null {
  const wf = content.projectDetail.workflow;
  const { draggedMember } = useWorkflowTaskAssigneeDrag();

  if (draggedMember == null) {
    return null;
  }

  return (
    <div className={styles.workflowAssigneeDragHeld} role="status" aria-live="polite">
      <span className={styles.workflowAssigneeDragHeldAvatar}>
        <TeamMemberAvatar member={draggedMember} />
      </span>
      <span className={styles.workflowAssigneeDragHeldLabel}>
        {wf.usersColumnDragLabel(draggedMember.displayName)}
      </span>
    </div>
  );
}
