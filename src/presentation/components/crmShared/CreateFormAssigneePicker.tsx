'use client';

import type { ReactElement } from 'react';
import { useRef, useState } from 'react';
import { AssigneeMenuOptionLabel } from '@/presentation/features/crmAssignment/AssigneeMenuOptionLabel';
import type { AssigneeOption } from '@/presentation/features/crmAssignment/buildAssigneeOptions';
import { TeamMemberAvatar } from '@/presentation/components/CrmProjectDetail/TeamMemberAvatar';
import { WorkflowInlineMenu } from '@/presentation/components/CrmProjectDetail/WorkflowInlineMenu';
import detailStyles from '@/presentation/components/CrmProjectDetail/ProjectDetail.module.css';
import shared from './crmShared.module.css';
import formStyles from '@/presentation/components/CrmProjects/CreateCrmProjectDrawer.module.css';

export type CreateFormAssigneePickerProps = {
  readonly value: string;
  readonly options: readonly AssigneeOption[];
  readonly disabled?: boolean;
  readonly unassignedLabel: string;
  readonly ariaLabel: string;
  readonly variant?: 'compact' | 'field';
  readonly onChange: (memberId: string) => void;
};

export function CreateFormAssigneePicker({
  value,
  options,
  disabled = false,
  unassignedLabel,
  ariaLabel,
  variant = 'compact',
  onChange,
}: CreateFormAssigneePickerProps): ReactElement {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.id === value);
  const isFieldVariant = variant === 'field';

  return (
    <div
      ref={anchorRef}
      className={isFieldVariant ? formStyles.formSelectPicker : formStyles.assigneePickerWrap}
    >
      <button
        type="button"
        className={
          isFieldVariant
            ? `${formStyles.input} ${formStyles.select} ${formStyles.formSelectTrigger} ${formStyles.assigneeFieldTrigger}`
            : formStyles.assigneePickerBtn
        }
        disabled={disabled}
        aria-expanded={open}
        aria-label={ariaLabel}
        title={selected?.member?.displayName ?? selected?.label ?? unassignedLabel}
        onClick={() => setOpen((isOpen) => !isOpen)}
      >
        {isFieldVariant ? (
          selected ? (
            <AssigneeMenuOptionLabel option={selected} />
          ) : (
            <span className={formStyles.formSelectPlaceholder}>{unassignedLabel}</span>
          )
        ) : selected?.member ? (
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
