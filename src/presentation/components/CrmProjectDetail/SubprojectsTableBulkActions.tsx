'use client';

import { useRef, useState, type ReactElement } from 'react';
import { BsCheckLg, BsExclamationOctagon, BsThreeDotsVertical } from 'react-icons/bs';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import type { AssigneeOption } from '@/presentation/features/crmAssignment/buildAssigneeOptions';
import { BulkAssignMemberMenu } from '@/presentation/components/crmShared/BulkAssignMemberMenu';
import { WorkflowInlineMenu } from './WorkflowInlineMenu';
import styles from './ProjectDetail.module.css';

export type SubprojectsTableBulkActionsProps = {
  readonly busy?: boolean;
  readonly canMakePriority: boolean;
  readonly canMarkInactive: boolean;
  readonly canMarkComplete: boolean;
  readonly canAssign: boolean;
  readonly assigneeOptions: readonly AssigneeOption[];
  readonly onMakePriority: () => void;
  readonly onMarkInactive: () => void;
  readonly onMarkComplete: () => void;
  readonly onAssign: (assignedMemberId: string) => void;
};

/** Gmail-style bulk icons: priority, complete, multi-assign, then overflow (mark inactive…). */
export function SubprojectsTableBulkActions({
  busy = false,
  canMakePriority,
  canMarkInactive,
  canMarkComplete,
  canAssign,
  assigneeOptions,
  onMakePriority,
  onMarkInactive,
  onMarkComplete,
  onAssign,
}: SubprojectsTableBulkActionsProps): ReactElement {
  const tableCopy = content.crm.table;
  const inactiveCopy = content.projectDetail.subprojects.markInactive;
  const bulkCopy = content.bulkSelection;
  const moreAnchorRef = useRef<HTMLSpanElement>(null);
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <span className={styles.workflowBulkActions} role="toolbar" aria-label={bulkCopy.toolbarAriaLabel}>
      <button
        type="button"
        className={styles.workflowBulkActionBtn}
        disabled={busy || !canMakePriority}
        title={tableCopy.makePriority}
        aria-label={tableCopy.makePriority}
        onClick={onMakePriority}
      >
        <BsExclamationOctagon className={styles.workflowBulkActionGlyph} aria-hidden />
      </button>
      <button
        type="button"
        className={styles.workflowBulkActionBtn}
        disabled={busy || !canMarkComplete}
        title={tableCopy.markComplete}
        aria-label={tableCopy.markComplete}
        onClick={onMarkComplete}
      >
        <BsCheckLg className={styles.workflowBulkActionGlyph} aria-hidden />
      </button>
      <BulkAssignMemberMenu
        busy={busy}
        disabled={!canAssign}
        title={tableCopy.multiAssign}
        options={assigneeOptions}
        onAssign={onAssign}
      />
      <span ref={moreAnchorRef} className={styles.workflowBulkStatusWrap}>
        <button
          type="button"
          className={styles.workflowBulkActionBtn}
          disabled={busy}
          title={bulkCopy.actionsMenuAriaLabel}
          aria-label={bulkCopy.actionsMenuAriaLabel}
          aria-expanded={moreOpen}
          aria-haspopup="menu"
          onClick={() => setMoreOpen((open) => !open)}
        >
          <BsThreeDotsVertical className={styles.workflowBulkActionGlyph} aria-hidden />
        </button>
        <WorkflowInlineMenu
          open={moreOpen}
          onClose={() => setMoreOpen(false)}
          anchorRef={moreAnchorRef}
          align="start"
          sizeToContent
          portalClassName={`${styles.inlineMenu_portal} ${styles.actionsMenu_portal}`}
        >
          <button
            type="button"
            role="menuitem"
            className={`${styles.inlineMenuAction} ${styles.actionsMenuItem}`}
            disabled={busy || !canMarkInactive}
            onClick={() => {
              setMoreOpen(false);
              onMarkInactive();
            }}
          >
            <span
              className={`${styles.actionsMenuIcon} ${styles.actionsMenuMarkInactiveIcon}`}
              aria-hidden
            />
            {inactiveCopy.bulkMenuAction}
          </button>
        </WorkflowInlineMenu>
      </span>
    </span>
  );
}
