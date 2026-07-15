'use client';

import { useRef, useState, type ReactElement } from 'react';
import { BsPeople } from 'react-icons/bs';
import type { AssigneeOption } from '@/presentation/features/crmAssignment/buildAssigneeOptions';
import { AssigneeMenuOptionLabel } from '@/presentation/features/crmAssignment/AssigneeMenuOptionLabel';
import { WorkflowInlineMenu } from '@/presentation/components/CrmProjectDetail/WorkflowInlineMenu';
import shared from '@/presentation/components/crmShared/crmShared.module.css';
import styles from '@/presentation/components/CrmProjectDetail/ProjectDetail.module.css';

export type BulkAssignMemberMenuProps = {
  readonly busy?: boolean;
  readonly disabled?: boolean;
  readonly title: string;
  readonly options: readonly AssigneeOption[];
  readonly onAssign: (assignedMemberId: string) => void;
};

/** People icon + member dropdown for bulk-assigning selected rows. */
export function BulkAssignMemberMenu({
  busy = false,
  disabled = false,
  title,
  options,
  onAssign,
}: BulkAssignMemberMenuProps): ReactElement {
  const anchorRef = useRef<HTMLSpanElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const controlDisabled = busy || disabled;

  return (
    <span ref={anchorRef} className={styles.workflowBulkStatusWrap}>
      <button
        type="button"
        className={styles.workflowBulkActionBtn}
        disabled={controlDisabled}
        title={title}
        aria-label={title}
        aria-expanded={menuOpen}
        onClick={() => {
          if (controlDisabled) return;
          setMenuOpen((open) => !open);
        }}
      >
        <BsPeople className={styles.workflowBulkActionGlyph} aria-hidden />
      </button>
      <WorkflowInlineMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        anchorRef={anchorRef}
        align="start"
        sizeToContent
      >
        {options.map((option) => (
          <button
            key={option.id || 'unassigned'}
            type="button"
            className={`${styles.inlineMenuAction} ${shared.assigneeMenuAction}`}
            disabled={busy || option.disabled === true}
            onClick={() => {
              if (option.disabled) return;
              setMenuOpen(false);
              onAssign(option.id);
            }}
          >
            <AssigneeMenuOptionLabel option={option} />
          </button>
        ))}
      </WorkflowInlineMenu>
    </span>
  );
}
