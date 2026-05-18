'use client';

import type { ReactElement } from 'react';
import { useRef, useState } from 'react';
import type { WorkflowTaskStatus } from '@/domain/crm';
import { WORKFLOW_TASK_STATUSES } from '@/domain/crm/workflowTaskStatuses';
import { formatWorkflowStatus } from '@/presentation/features/crmProjectDetail/crmProjectDetailFormatters';
import shared from '@/presentation/components/crmShared/crmShared.module.css';
import { WorkflowInlineMenu } from './WorkflowInlineMenu';
import styles from './ProjectDetail.module.css';

function statusBadgeClass(status: WorkflowTaskStatus): string {
  return shared[`statusBadge_${status}`] ?? shared.statusBadge_pending;
}

export type WorkflowStatusPillPickerProps = {
  value: WorkflowTaskStatus;
  onChange: (status: WorkflowTaskStatus) => void;
  disabled?: boolean;
};

export function WorkflowStatusPillPicker({
  value,
  onChange,
  disabled = false,
}: WorkflowStatusPillPickerProps): ReactElement {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={anchorRef} className={styles.formStatusPicker}>
      <button
        type="button"
        className={styles.formStatusPickerTrigger}
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((isOpen) => !isOpen)}
      >
        <span className={`${styles.statusPill} ${statusBadgeClass(value)}`}>
          {formatWorkflowStatus(value)}
        </span>
        <span className={styles.formStatusPickerCaret} aria-hidden />
      </button>
      <WorkflowInlineMenu
        open={open}
        onClose={() => setOpen(false)}
        anchorRef={anchorRef}
        portalClassName={styles.formStatusPickerMenuPortal}
      >
        <div className={styles.formStatusPickerMenu} role="listbox">
          {WORKFLOW_TASK_STATUSES.map((status) => (
            <button
              key={status}
              type="button"
              role="option"
              aria-selected={status === value}
              className={styles.inlineMenuPillOption}
              disabled={disabled}
              onClick={() => {
                onChange(status);
                setOpen(false);
              }}
            >
              <span className={`${styles.statusPill} ${statusBadgeClass(status)}`}>
                {formatWorkflowStatus(status)}
              </span>
            </button>
          ))}
        </div>
      </WorkflowInlineMenu>
    </div>
  );
}
