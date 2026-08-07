'use client';

import { useRef, useState, type ReactElement } from 'react';
import { LuCircleAlert } from 'react-icons/lu';
import type { CrmProjectStatus } from '@/domain/crm';
import { CRM_PROJECT_STATUS_OPTIONS } from '@/domain/crm';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import type { AssigneeOption } from '@/presentation/features/crmAssignment/buildAssigneeOptions';
import { resolveCrmProjectStatusBadgeTone } from '@/presentation/features/crmProjectDetail/crmProjectStatusPill';
import { BulkAssignMemberMenu } from '@/presentation/components/crmShared/BulkAssignMemberMenu';
import { WorkflowInlineMenu } from './WorkflowInlineMenu';
import styles from './ProjectDetail.module.css';

function projectStatusBadgeClass(status: CrmProjectStatus): string {
  const tone = resolveCrmProjectStatusBadgeTone(status);
  switch (tone) {
    case 'completed':
      return styles.overviewStatusBadgeCompleted;
    case 'lost':
      return styles.overviewStatusBadgeLost;
    case 'cancelled':
      return styles.overviewStatusBadgeCancelled;
    case 'active':
    default:
      return styles.overviewStatusBadgeActive;
  }
}

export type SubprojectsTableBulkActionsProps = {
  readonly busy?: boolean;
  readonly canMakePriority: boolean;
  readonly canAssign: boolean;
  readonly canChangeStatus?: boolean;
  readonly assigneeOptions: readonly AssigneeOption[];
  readonly onMakePriority: () => void;
  readonly onAssign: (assignedMemberId: string) => void;
  readonly onChangeStatus?: (status: CrmProjectStatus) => void;
};

/** Gmail-style bulk icons: priority, change status, multi-assign. */
export function SubprojectsTableBulkActions({
  busy = false,
  canMakePriority,
  canAssign,
  canChangeStatus = false,
  assigneeOptions,
  onMakePriority,
  onAssign,
  onChangeStatus,
}: SubprojectsTableBulkActionsProps): ReactElement {
  const tableCopy = content.crm.table;
  const statusCopy = content.projectDetail.projectStatus;
  const bulkCopy = content.bulkSelection;
  const statusAnchorRef = useRef<HTMLSpanElement>(null);
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const showChangeStatus = canChangeStatus && onChangeStatus != null;

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
        <LuCircleAlert
          className={styles.workflowBulkActionGlyph}
          size={16}
          strokeWidth={2}
          aria-hidden
        />
      </button>
      {showChangeStatus ? (
        <span ref={statusAnchorRef} className={styles.workflowBulkStatusWrap}>
          <button
            type="button"
            className={styles.workflowBulkActionBtn}
            disabled={busy}
            title={statusCopy.bulkChangeStatus}
            aria-label={statusCopy.bulkChangeStatusAriaLabel}
            aria-expanded={statusMenuOpen}
            aria-haspopup="menu"
            onClick={() => setStatusMenuOpen((open) => !open)}
          >
            <svg
              className={styles.workflowBulkActionGlyph}
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden
            >
              <path
                d="M4 7h16M7 12h10M10 17h4"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
          <WorkflowInlineMenu
            open={statusMenuOpen}
            onClose={() => setStatusMenuOpen(false)}
            anchorRef={statusAnchorRef}
            align="start"
            sizeToContent
            portalClassName={styles.formStatusPickerMenuPortal}
          >
            <div
              className={styles.overviewStatusPillMenu}
              role="menu"
              aria-label={statusCopy.bulkChangeStatus}
            >
              {CRM_PROJECT_STATUS_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="menuitem"
                  className={styles.overviewStatusPillOption}
                  disabled={busy}
                  onClick={() => {
                    setStatusMenuOpen(false);
                    onChangeStatus(option.value);
                  }}
                >
                  <span className={projectStatusBadgeClass(option.value)}>{option.label}</span>
                </button>
              ))}
            </div>
          </WorkflowInlineMenu>
        </span>
      ) : null}
      <BulkAssignMemberMenu
        busy={busy}
        disabled={!canAssign}
        title={tableCopy.multiAssign}
        options={assigneeOptions}
        onAssign={onAssign}
      />
    </span>
  );
}
