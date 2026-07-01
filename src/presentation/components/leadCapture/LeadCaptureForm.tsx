'use client';

import type { FormEvent, ReactElement, ReactNode } from 'react';
import { useState } from 'react';
import {
  sanitizeCityInput,
  sanitizePostalCodeInput,
} from '@/domain/crm/projectFormFieldValidation';
import type { LeadCaptureSubmitInput } from '@/domain/lead/leadCapture';
import {
  validateLeadCaptureFormFields,
  type LeadCaptureFormFieldErrors,
  type LeadCaptureFormFieldKey,
} from '@/infrastructure/crm/server/validateLeadCaptureBody';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import {
  ContactMultiValueFields,
  CONTACT_EMAIL_FIELD_MAX,
  CONTACT_PHONE_FIELD_MAX,
} from '@/presentation/components/crmShared/ContactMultiValueFields';
import { UsStateCombobox } from '@/presentation/components/crmShared/UsStateCombobox';
import styles from './LeadCapture.module.css';

export type LeadCaptureFormProps = {
  readonly disabled?: boolean;
  readonly submitting?: boolean;
  readonly onSubmit: (input: LeadCaptureSubmitInput) => Promise<void>;
};

type LeadCaptureFormState = {
  firstName: string;
  lastName: string;
  emails: string[];
  phones: string[];
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
};

const EMPTY_FORM: LeadCaptureFormState = {
  firstName: '',
  lastName: '',
  emails: [''],
  phones: [''],
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  postalCode: '',
};

type FieldLabelProps = {
  readonly htmlFor: string;
  readonly label: string;
  readonly required?: boolean;
};

function FieldLabel({ htmlFor, label, required = false }: FieldLabelProps): ReactElement {
  return (
    <label className={styles.label} htmlFor={htmlFor}>
      {label}
      {required ? (
        <span className={styles.requiredMark} aria-hidden="true">
          {' '}
          *
        </span>
      ) : null}
    </label>
  );
}

type FormFieldProps = {
  readonly id: LeadCaptureFormFieldKey | 'addressLine2';
  readonly label: string;
  readonly required?: boolean;
  readonly error?: string;
  readonly children: ReactNode;
};

function FormField({ id, label, required = false, error, children }: FormFieldProps): ReactElement {
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div className={styles.field}>
      <FieldLabel htmlFor={id} label={label} required={required} />
      {children}
      {error ? (
        <p className={styles.fieldError} id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function LeadCaptureForm({
  disabled = false,
  submitting = false,
  onSubmit,
}: LeadCaptureFormProps): ReactElement {
  const copy = content.leadCapture.form;
  const [form, setForm] = useState<LeadCaptureFormState>(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<LeadCaptureFormFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  const updateField = <K extends keyof LeadCaptureFormState>(key: K, value: LeadCaptureFormState[K]): void => {
    setForm((current) => ({ ...current, [key]: value }));
    if (key in fieldErrors) {
      setFieldErrors((current) => {
        const next = { ...current };
        delete next[key as LeadCaptureFormFieldKey];
        return next;
      });
    }
    setFormError(null);
  };

  const clearContactFieldError = (field: 'email' | 'phone'): void => {
    if (fieldErrors[field] == null) return;
    setFieldErrors((current) => {
      const next = { ...current };
      delete next[field];
      return next;
    });
    setFormError(null);
  };

  const inputClassName = (field: LeadCaptureFormFieldKey | 'addressLine2'): string => {
    const hasError = field !== 'addressLine2' && fieldErrors[field] != null;
    return hasError ? `${styles.input} ${styles.inputInvalid}` : styles.input;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (disabled || submitting) return;

    setFormError(null);

    const validated = validateLeadCaptureFormFields({
      firstName: form.firstName,
      lastName: form.lastName,
      emails: form.emails,
      phones: form.phones,
      addressLine1: form.addressLine1,
      addressLine2: form.addressLine2,
      city: form.city,
      state: form.state,
      postalCode: form.postalCode,
    });

    if (!validated.ok) {
      setFieldErrors(validated.errors);
      return;
    }

    setFieldErrors({});

    try {
      await onSubmit(validated.input);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : copy.submitFailed);
    }
  };

  return (
    <form className={styles.form} onSubmit={(event) => void handleSubmit(event)} noValidate>
      <div className={styles.nameFieldGrid}>
        <FormField
          id="firstName"
          label={copy.firstNameLabel}
          required
          error={fieldErrors.firstName}
        >
          <input
            id="firstName"
            type="text"
            className={inputClassName('firstName')}
            value={form.firstName}
            autoComplete="given-name"
            aria-required="true"
            aria-invalid={fieldErrors.firstName != null}
            aria-describedby={fieldErrors.firstName ? 'firstName-error' : undefined}
            disabled={disabled || submitting}
            onChange={(event) => updateField('firstName', event.target.value)}
          />
        </FormField>
        <FormField id="lastName" label={copy.lastNameLabel} required error={fieldErrors.lastName}>
          <input
            id="lastName"
            type="text"
            className={inputClassName('lastName')}
            value={form.lastName}
            autoComplete="family-name"
            aria-required="true"
            aria-invalid={fieldErrors.lastName != null}
            aria-describedby={fieldErrors.lastName ? 'lastName-error' : undefined}
            disabled={disabled || submitting}
            onChange={(event) => updateField('lastName', event.target.value)}
          />
        </FormField>
      </div>

      <div className={styles.contactEmailPhoneGrid}>
        <div className={styles.contactFieldBlock}>
          <ContactMultiValueFields
            label={copy.emailAddressesLabel}
            values={form.emails}
            inputType="email"
            disabled={disabled || submitting}
            maxCount={CONTACT_EMAIL_FIELD_MAX}
            idPrefix="lead-capture-email"
            addButtonLabel={copy.addEmail}
            addAriaLabel={copy.addEmail}
            removeAriaLabel={copy.removeEmail}
            removeConfirmCopy={copy.removeEmailConfirm}
            onChange={(emails) => {
              updateField('emails', emails);
              clearContactFieldError('email');
            }}
          />
          {fieldErrors.email ? (
            <p className={styles.fieldError} id="email-error" role="alert">
              {fieldErrors.email}
            </p>
          ) : null}
        </div>
        <div className={styles.contactFieldBlock}>
          <ContactMultiValueFields
            label={copy.phoneNumbersLabel}
            values={form.phones}
            inputType="tel"
            disabled={disabled || submitting}
            maxCount={CONTACT_PHONE_FIELD_MAX}
            idPrefix="lead-capture-phone"
            addButtonLabel={copy.addPhone}
            addAriaLabel={copy.addPhone}
            removeAriaLabel={copy.removePhone}
            removeConfirmCopy={copy.removePhoneConfirm}
            onChange={(phones) => {
              updateField('phones', phones);
              clearContactFieldError('phone');
            }}
          />
          {fieldErrors.phone ? (
            <p className={styles.fieldError} id="phone-error" role="alert">
              {fieldErrors.phone}
            </p>
          ) : null}
        </div>
      </div>

      <FormField id="addressLine1" label={copy.addressLine1Label} required error={fieldErrors.addressLine1}>
        <input
          id="addressLine1"
          type="text"
          className={inputClassName('addressLine1')}
          value={form.addressLine1}
          autoComplete="address-line1"
          aria-required="true"
          aria-invalid={fieldErrors.addressLine1 != null}
          aria-describedby={fieldErrors.addressLine1 ? 'addressLine1-error' : undefined}
          disabled={disabled || submitting}
          onChange={(event) => updateField('addressLine1', event.target.value)}
        />
      </FormField>

      <FormField id="addressLine2" label={copy.addressLine2Label}>
        <input
          id="addressLine2"
          type="text"
          className={inputClassName('addressLine2')}
          value={form.addressLine2}
          autoComplete="address-line2"
          disabled={disabled || submitting}
          onChange={(event) => updateField('addressLine2', event.target.value)}
        />
      </FormField>

      <div className={styles.addressFieldGrid}>
        <FormField id="city" label={copy.cityLabel} required error={fieldErrors.city}>
          <input
            id="city"
            type="text"
            className={inputClassName('city')}
            value={form.city}
            autoComplete="address-level2"
            aria-required="true"
            aria-invalid={fieldErrors.city != null}
            aria-describedby={fieldErrors.city ? 'city-error' : undefined}
            disabled={disabled || submitting}
            onChange={(event) => updateField('city', sanitizeCityInput(event.target.value))}
          />
        </FormField>
        <FormField id="state" label={copy.stateLabel} required error={fieldErrors.state}>
          <UsStateCombobox
            id="state"
            value={form.state}
            disabled={disabled || submitting}
            ariaLabel={copy.stateLabel}
            placeholder={copy.statePlaceholder}
            inputClassName={inputClassName('state')}
            invalid={fieldErrors.state != null}
            menuPortalClassName={styles.stateMenuPortal}
            menuOptionClassName={styles.stateMenuOption}
            menuOptionSelectedClassName={styles.stateMenuOption_selected}
            onChange={(state) => updateField('state', state)}
          />
        </FormField>
        <FormField id="postalCode" label={copy.postalCodeLabel} required error={fieldErrors.postalCode}>
          <input
            id="postalCode"
            type="text"
            className={inputClassName('postalCode')}
            value={form.postalCode}
            autoComplete="postal-code"
            inputMode="numeric"
            maxLength={5}
            aria-required="true"
            aria-invalid={fieldErrors.postalCode != null}
            aria-describedby={fieldErrors.postalCode ? 'postalCode-error' : undefined}
            disabled={disabled || submitting}
            onChange={(event) => updateField('postalCode', sanitizePostalCodeInput(event.target.value))}
          />
        </FormField>
      </div>

      {formError ? (
        <p className={styles.error} role="alert">
          {formError}
        </p>
      ) : null}

      <button type="submit" className={styles.submitBtn} disabled={disabled || submitting}>
        {submitting ? copy.submitting : copy.submit}
      </button>
    </form>
  );
}
