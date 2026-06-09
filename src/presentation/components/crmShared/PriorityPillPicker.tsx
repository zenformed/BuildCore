'use client';

import type { ReactElement } from 'react';
import { useRef, useState } from 'react';
import type { CrmPriority } from '@/domain/crm';
import { WorkflowInlineMenu } from '@/presentation/components/CrmProjectDetail/WorkflowInlineMenu';
import formStyles from '@/presentation/components/CrmProjects/CreateCrmProjectDrawer.module.css';
import shared from './crmShared.module.css';

const CRM_PRIORITIES: readonly CrmPriority[] = ['low', 'normal', 'high', 'urgent'];

function priorityClass(priority: CrmPriority): string {
  return shared[`priority_${priority}`] ?? shared.priority_normal;
}

export type PriorityPillPickerProps = {
  readonly value: CrmPriority;
  readonly onChange: (priority: CrmPriority) => void;
  readonly disabled?: boolean;
  readonly id?: string;
  readonly ariaLabel?: string;
};

export function PriorityPillPicker({
  value,
  onChange,
  disabled = false,
  id,
  ariaLabel,
}: PriorityPillPickerProps): ReactElement {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={anchorRef} className={formStyles.priorityPicker}>
      <button
        id={id}
        type="button"
        className={formStyles.priorityPickerTrigger}
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        onClick={() => setOpen((isOpen) => !isOpen)}
      >
        <span className={priorityClass(value)}>{value}</span>
        <span className={formStyles.priorityPickerCaret} aria-hidden />
      </button>
      <WorkflowInlineMenu
        open={open}
        onClose={() => setOpen(false)}
        anchorRef={anchorRef}
        portalClassName={formStyles.priorityPickerMenuPortal}
        sizeToContent
      >
        <div className={formStyles.priorityPickerMenu} role="listbox">
          {CRM_PRIORITIES.map((priority) => (
            <button
              key={priority}
              type="button"
              role="option"
              aria-selected={priority === value}
              className={formStyles.priorityPickerOption}
              disabled={disabled}
              onClick={() => {
                onChange(priority);
                setOpen(false);
              }}
            >
              <span className={priorityClass(priority)}>{priority}</span>
            </button>
          ))}
        </div>
      </WorkflowInlineMenu>
    </div>
  );
}
