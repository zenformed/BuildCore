'use client';

import { useRef, useState, type ReactElement } from 'react';
import { WorkflowInlineMenu } from '@/presentation/components/CrmProjectDetail/WorkflowInlineMenu';
import formStyles from '@/presentation/components/CrmProjects/CreateCrmProjectDrawer.module.css';

export type CreateFormSelectOption = {
  readonly value: string;
  readonly label: string;
};

export type CreateFormSelectPickerProps = {
  readonly id?: string;
  readonly value: string;
  readonly options: readonly CreateFormSelectOption[];
  readonly placeholder?: string;
  readonly disabled?: boolean;
  readonly ariaLabel: string;
  readonly onChange: (value: string) => void;
};

export function CreateFormSelectPicker({
  id,
  value,
  options,
  placeholder,
  disabled = false,
  ariaLabel,
  onChange,
}: CreateFormSelectPickerProps): ReactElement {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.value === value);
  const displayLabel = selected?.label ?? placeholder ?? '';

  return (
    <div ref={anchorRef} className={formStyles.formSelectPicker}>
      <button
        id={id}
        type="button"
        className={`${formStyles.input} ${formStyles.select} ${formStyles.formSelectTrigger}`}
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        onClick={() => setOpen((isOpen) => !isOpen)}
      >
        <span className={selected ? undefined : formStyles.formSelectPlaceholder}>{displayLabel}</span>
      </button>
      <WorkflowInlineMenu
        open={open}
        onClose={() => setOpen(false)}
        anchorRef={anchorRef}
        portalClassName={formStyles.formSelectMenuPortal}
      >
        <div role="listbox" aria-label={ariaLabel}>
          {placeholder != null ? (
            <button
              type="button"
              role="option"
              aria-selected={value === ''}
              className={`${formStyles.formSelectMenuOption}${
                value === '' ? ` ${formStyles.formSelectMenuOption_selected}` : ''
              }`}
              onClick={() => {
                onChange('');
                setOpen(false);
              }}
            >
              {placeholder}
            </button>
          ) : null}
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
}
