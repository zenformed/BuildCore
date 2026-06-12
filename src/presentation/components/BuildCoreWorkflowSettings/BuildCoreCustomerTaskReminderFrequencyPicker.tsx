'use client';

import { useRef, useState, type ReactElement } from 'react';
import type { CustomerTaskReminderFrequencyMinutes } from '@/domain/buildcore/buildCoreOrganizationSettings';
import { ClockIcon } from '@/platform/icons/buildCoreDashboardShellIcons';
import { WorkflowInlineMenu } from '@/presentation/components/CrmProjectDetail/WorkflowInlineMenu';
import formStyles from '@/presentation/components/CrmProjects/CreateCrmProjectDrawer.module.css';
import styles from './BuildCoreWorkflowSettings.module.css';

export type BuildCoreCustomerTaskReminderFrequencyOption = {
  readonly value: CustomerTaskReminderFrequencyMinutes;
  readonly label: string;
};

export type BuildCoreCustomerTaskReminderFrequencyPickerProps = {
  readonly value: CustomerTaskReminderFrequencyMinutes;
  readonly options: readonly BuildCoreCustomerTaskReminderFrequencyOption[];
  readonly disabled?: boolean;
  readonly ariaLabel: string;
  readonly className?: string;
  readonly onChange: (minutes: CustomerTaskReminderFrequencyMinutes) => void;
};

export function BuildCoreCustomerTaskReminderFrequencyPicker({
  value,
  options,
  disabled = false,
  ariaLabel,
  className,
  onChange,
}: BuildCoreCustomerTaskReminderFrequencyPickerProps): ReactElement {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.value === value);
  const displayLabel = selected?.label ?? '';

  const picker = (
    <div ref={anchorRef} className={styles.frequencyPicker}>
      <button
        type="button"
        className={styles.frequencyPickerTrigger}
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={`${ariaLabel}: ${displayLabel}`}
        onClick={() => setOpen((isOpen) => !isOpen)}
      >
        <ClockIcon className={styles.frequencyPickerIcon} />
      </button>
      <span className={styles.frequencyPickerLabel} aria-hidden>
        {displayLabel}
      </span>
      <WorkflowInlineMenu
        open={open}
        onClose={() => setOpen(false)}
        anchorRef={anchorRef}
        align="end"
        sizeToContent
        portalClassName={formStyles.formSelectMenuPortal}
      >
        <div role="listbox" aria-label={ariaLabel}>
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={option.value === value}
              className={`${formStyles.formSelectMenuOption}${
                option.value === value ? ` ${formStyles.formSelectMenuOption_selected}` : ''
              }`}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      </WorkflowInlineMenu>
    </div>
  );

  if (className) {
    return <div className={className}>{picker}</div>;
  }

  return picker;
}
