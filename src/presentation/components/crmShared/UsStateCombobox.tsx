'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactElement,
} from 'react';
import { US_STATE_OPTIONS } from '@/domain/crm/usStates';
import { WorkflowInlineMenu } from '@/presentation/components/CrmProjectDetail/WorkflowInlineMenu';
import formStyles from '@/presentation/components/CrmProjects/CreateCrmProjectDrawer.module.css';

export type UsStateComboboxProps = {
  readonly id?: string;
  readonly value: string;
  readonly disabled?: boolean;
  readonly ariaLabel: string;
  readonly placeholder?: string;
  readonly inputClassName?: string;
  readonly invalid?: boolean;
  readonly menuPortalClassName?: string;
  readonly menuOptionClassName?: string;
  readonly menuOptionSelectedClassName?: string;
  readonly onChange: (stateCode: string) => void;
};

function findStateByCode(code: string) {
  return US_STATE_OPTIONS.find((state) => state.code === code);
}

export function UsStateCombobox({
  id,
  value,
  disabled = false,
  ariaLabel,
  placeholder = 'Select state',
  inputClassName,
  invalid = false,
  menuPortalClassName,
  menuOptionClassName,
  menuOptionSelectedClassName,
  onChange,
}: UsStateComboboxProps): ReactElement {
  const [open, setOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const anchorRef = useRef<HTMLDivElement>(null);
  const selected = findStateByCode(value);

  useEffect(() => {
    if (!open) {
      setInputText(selected?.name ?? '');
    }
  }, [open, selected?.name]);

  const filteredOptions = useMemo(() => {
    const query = inputText.trim().toLowerCase();
    if (!query) return US_STATE_OPTIONS;
    return US_STATE_OPTIONS.filter(
      (state) =>
        state.name.toLowerCase().includes(query) || state.code.toLowerCase().includes(query)
    );
  }, [inputText]);

  const commitSelection = useCallback(
    (code: string) => {
      onChange(code);
      const state = findStateByCode(code);
      setInputText(state?.name ?? '');
      setOpen(false);
    },
    [onChange]
  );

  const handleInputChange = (nextText: string) => {
    setInputText(nextText);
    setOpen(true);

    const query = nextText.trim().toLowerCase();
    if (!query) {
      onChange('');
      return;
    }

    const exact = US_STATE_OPTIONS.find(
      (state) => state.name.toLowerCase() === query || state.code.toLowerCase() === query
    );
    if (exact) {
      onChange(exact.code);
    }
  };

  const handleBlur = () => {
    window.setTimeout(() => {
      setOpen(false);

      const current = findStateByCode(value);
      if (current) {
        setInputText(current.name);
        return;
      }

      const query = inputText.trim().toLowerCase();
      if (!query) {
        onChange('');
        setInputText('');
        return;
      }

      if (filteredOptions.length === 1) {
        commitSelection(filteredOptions[0]!.code);
        return;
      }

      setInputText('');
      onChange('');
    }, 120);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
      setInputText(selected?.name ?? '');
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      if (filteredOptions.length > 0) {
        commitSelection(filteredOptions[0]!.code);
      }
    }
  };

  const inputClasses = inputClassName ?? `${formStyles.input} ${formStyles.usStateComboboxInput}`;
  const menuPortalClass = menuPortalClassName ?? formStyles.formSelectMenuPortal;
  const menuOptionClass = menuOptionClassName ?? formStyles.formSelectMenuOption;
  const menuOptionSelectedClass =
    menuOptionSelectedClassName ?? formStyles.formSelectMenuOption_selected;

  return (
    <div ref={anchorRef} className={formStyles.formSelectPicker}>
      <input
        id={id}
        type="text"
        className={inputClasses}
        value={inputText}
        disabled={disabled}
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        aria-controls={id ? `${id}-listbox` : undefined}
        aria-label={ariaLabel}
        aria-invalid={invalid}
        placeholder={placeholder}
        autoComplete="address-level1"
        onFocus={() => setOpen(true)}
        onBlur={handleBlur}
        onChange={(event) => handleInputChange(event.target.value)}
        onKeyDown={handleKeyDown}
      />
      <WorkflowInlineMenu
        open={open && filteredOptions.length > 0}
        onClose={() => setOpen(false)}
        anchorRef={anchorRef}
        portalClassName={menuPortalClass}
      >
        <div id={id ? `${id}-listbox` : undefined} role="listbox" aria-label={ariaLabel}>
          {filteredOptions.map((state) => (
            <button
              key={state.code}
              type="button"
              role="option"
              aria-selected={state.code === value}
              className={`${menuOptionClass}${
                state.code === value ? ` ${menuOptionSelectedClass}` : ''
              }`}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => commitSelection(state.code)}
            >
              {state.name}
            </button>
          ))}
        </div>
      </WorkflowInlineMenu>
    </div>
  );
}
