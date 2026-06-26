'use client';

import type { ReactElement } from 'react';
import { MAX_CONTACT_EMAILS, MAX_CONTACT_PHONES } from '@/domain/crm/contactMultiValue';
import formStyles from '@/presentation/components/CrmProjects/CreateCrmProjectDrawer.module.css';

export type ContactMultiValueFieldsProps = {
  readonly label: string;
  readonly values: readonly string[];
  readonly inputType: 'email' | 'tel';
  readonly disabled: boolean;
  readonly maxCount: number;
  readonly idPrefix: string;
  readonly addAriaLabel: string;
  readonly removeAriaLabel: string;
  readonly onChange: (values: string[]) => void;
};

export function ContactMultiValueFields({
  label,
  values,
  inputType,
  disabled,
  maxCount,
  idPrefix,
  addAriaLabel,
  removeAriaLabel,
  onChange,
}: ContactMultiValueFieldsProps): ReactElement {
  const canAdd = values.length < maxCount && !disabled;
  const lastIndex = values.length - 1;
  const hasCornerControls = canAdd || values.length > 1;

  const updateValue = (index: number, nextValue: string) => {
    const next = [...values];
    next[index] = nextValue;
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
    <div
      className={`${formStyles.contactMultiSection}${
        hasCornerControls ? ` ${formStyles.contactMultiSectionHasCornerControls}` : ''
      }`}
    >
      <span className={formStyles.label}>{label}</span>
      {values.map((value, index) => {
        const isLast = index === lastIndex;
        const showAddOnRow = isLast && canAdd;
        const showRemoveOnRow = index > 0 && !(isLast && canAdd);

        return (
          <div key={`${idPrefix}-${index}`} className={formStyles.contactMultiRow}>
            <div className={formStyles.contactMultiInputWrap}>
              <input
                id={`${idPrefix}-${index}`}
                type={inputType}
                className={formStyles.input}
                value={value}
                disabled={disabled}
                onChange={(event) => updateValue(index, event.target.value)}
              />
              {showAddOnRow ? (
                <button
                  type="button"
                  className={`${formStyles.contactMultiCornerBtn} ${formStyles.contactMultiAddBtn}`}
                  onClick={addValue}
                  disabled={disabled}
                  aria-label={addAriaLabel}
                >
                  +
                </button>
              ) : null}
              {showRemoveOnRow ? (
                <button
                  type="button"
                  className={`${formStyles.contactMultiCornerBtn} ${formStyles.contactMultiRemoveBtn}`}
                  onClick={() => removeValue(index)}
                  disabled={disabled}
                  aria-label={removeAriaLabel}
                >
                  ×
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
