'use client';

import type { ReactElement } from 'react';
import { useRef, useState } from 'react';
import { AssigneeMenuOptionLabel } from '@/presentation/features/crmAssignment/AssigneeMenuOptionLabel';
import type { CrmProjectAssigneeOption } from '@/presentation/features/crmProjects/crmProjectAssigneeOptions';
import { TeamMemberAvatar } from '@/presentation/components/CrmProjectDetail/TeamMemberAvatar';
import { WorkflowInlineMenu } from '@/presentation/components/CrmProjectDetail/WorkflowInlineMenu';
import detailStyles from '@/presentation/components/CrmProjectDetail/ProjectDetail.module.css';
import shared from './crmShared.module.css';
import formStyles from '@/presentation/components/CrmProjects/CreateCrmProjectDrawer.module.css';

export type CreateFormAssigneePickerProps = {
  readonly value: string;
  readonly options: readonly CrmProjectAssigneeOption[];
  readonly disabled?: boolean;
  readonly unassignedLabel: string;
  readonly ariaLabel: string;
  readonly onChange: (memberId: string) => void;
};

export function CreateFormAssigneePicker({
  value,
  options,
  disabled = false,
  unassignedLabel,
  ariaLabel,
  onChange,
}: CreateFormAssigneePickerProps): ReactElement {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.id === value);

  return (
    <div ref={anchorRef} className={formStyles.assigneePickerWrap}>
      <button
        type="button"
        className={formStyles.assigneePickerBtn}
        disabled={disabled}
        aria-expanded={open}
        aria-label={ariaLabel}
        title={selected?.member?.displayName ?? unassignedLabel}
        onClick={() => setOpen((isOpen) => !isOpen)}
      >
        {selected?.member ? (
          <TeamMemberAvatar member={selected.member} />
        ) : (
          <span className={`${shared.avatar} ${shared.avatarUnassigned}`} aria-hidden>
            —
          </span>
        )}
      </button>
      <WorkflowInlineMenu
        open={open}
        onClose={() => setOpen(false)}
        anchorRef={anchorRef}
        align="start"
        sizeToContent
        portalClassName={formStyles.assigneePickerMenuPortal}
      >
        {options.map((option) => (
          <button
            key={option.id || 'unassigned'}
            type="button"
            className={`${detailStyles.inlineMenuAction} ${shared.assigneeMenuAction}`}
            disabled={disabled || option.disabled === true}
            onClick={() => {
              if (option.disabled) return;
              onChange(option.id);
              setOpen(false);
            }}
          >
            <AssigneeMenuOptionLabel option={option} />
          </button>
        ))}
      </WorkflowInlineMenu>
    </div>
  );
}
