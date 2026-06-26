'use client';

import type { ReactElement } from 'react';
import { MAX_CONTACT_EMAILS, MAX_CONTACT_PHONES } from '@/domain/crm/contactMultiValue';
import { formatUsPhoneInput } from '@/domain/crm/phoneFormat';
import formStyles from '@/presentation/components/CrmProjects/CreateCrmProjectDrawer.module.css';

export type ContactMultiValueFieldsProps = {
  readonly label: string;
  readonly values: readonly string[];
  readonly inputType: 'email' | 'tel';
  readonly disabled: boolean;
  readonly maxCount: number;
  readonly idPrefix: string;
  readonly addButtonLabel: string;
  readonly addAriaLabel: string;
  readonly removeAriaLabel: string;
  readonly onChange: (values: string[]) => void;
};

function ContactRemoveIcon(): ReactElement {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

export function ContactMultiValueFields({
  label,
  values,
  inputType,
  disabled,
  maxCount,
  idPrefix,
  addButtonLabel,
  addAriaLabel,
  removeAriaLabel,
  onChange,
}: ContactMultiValueFieldsProps): ReactElement {
  const canAdd = values.length < maxCount && !disabled;

  const updateValue = (index: number, nextValue: string) => {
    const next = [...values];
    next[index] = inputType === 'tel' ? formatUsPhoneInput(nextValue) : nextValue;
    onChange(next);
  };

  const addValue = () => {
    if (!canAdd) return;
    onChange([...values, '']);
  };

  const removeValue = (index: number) => {
    if (index <= 0 || values.length <= 1) return;
    onChange(values.filter((_, valueIndex) => valueIndex !== index));
  };

  return (
    <div className={formStyles.contactMultiSection}>
      <div className={formStyles.contactMultiHeader}>
        <span className={formStyles.label}>{label}</span>
        {canAdd ? (
          <button
            type="button"
            className={formStyles.contactMultiAddOutlineBtn}
            onClick={addValue}
            disabled={disabled}
            aria-label={addAriaLabel}
          >
            {addButtonLabel}
          </button>
        ) : null}
      </div>
      {values.map((value, index) => {
        const isExtra = index > 0;

        return (
          <div
            key={`${idPrefix}-${index}`}
            className={`${formStyles.contactMultiFieldRow}${isExtra ? ` ${formStyles.contactMultiFieldRowExtra}` : ''}`}
          >
            <div className={formStyles.contactMultiFieldRowInner}>
              <input
                id={`${idPrefix}-${index}`}
                type={inputType}
                className={formStyles.input}
                value={inputType === 'tel' ? formatUsPhoneInput(value) : value}
                disabled={disabled}
                inputMode={inputType === 'tel' ? 'tel' : undefined}
                autoComplete={inputType === 'tel' ? 'tel' : undefined}
                onChange={(event) => updateValue(index, event.target.value)}
              />
              {isExtra ? (
                <button
                  type="button"
                  className={formStyles.contactMultiRemoveBtn}
                  onClick={() => removeValue(index)}
                  disabled={disabled}
                  aria-label={removeAriaLabel}
                >
                  <ContactRemoveIcon />
                </button>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export const CONTACT_EMAIL_FIELD_MAX = MAX_CONTACT_EMAILS;
export const CONTACT_PHONE_FIELD_MAX = MAX_CONTACT_PHONES;
