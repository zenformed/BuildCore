'use client';

import type { FormEvent, ReactElement, ReactNode } from 'react';
import { useState } from 'react';
import { US_STATE_CODES } from '@/domain/crm/usStates';
import type { LeadCaptureSubmitInput } from '@/domain/lead/leadCapture';
import {
  validateLeadCaptureFormFields,
  type LeadCaptureFormFieldErrors,
  type LeadCaptureFormFieldKey,
} from '@/infrastructure/crm/server/validateLeadCaptureBody';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import styles from './LeadCapture.module.css';

export type LeadCaptureFormProps = {
  readonly disabled?: boolean;
  readonly submitting?: boolean;
  readonly onSubmit: (input: LeadCaptureSubmitInput) => Promise<void>;
};

type LeadCaptureFormState = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
};

const EMPTY_FORM: LeadCaptureFormState = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
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
      email: form.email,
      phone: form.phone,
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

  const stateOptions = [...US_STATE_CODES].sort();

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

      <FormField id="email" label={copy.emailLabel} required error={fieldErrors.email}>
        <input
          id="email"
          type="email"
          className={inputClassName('email')}
          value={form.email}
          autoComplete="email"
          inputMode="email"
          aria-required="true"
          aria-invalid={fieldErrors.email != null}
          aria-describedby={fieldErrors.email ? 'email-error' : undefined}
          disabled={disabled || submitting}
          onChange={(event) => updateField('email', event.target.value)}
        />
      </FormField>

      <FormField id="phone" label={copy.phoneLabel} required error={fieldErrors.phone}>
        <input
          id="phone"
          type="tel"
          className={inputClassName('phone')}
          value={form.phone}
          autoComplete="tel"
          inputMode="tel"
          aria-required="true"
          aria-invalid={fieldErrors.phone != null}
          aria-describedby={fieldErrors.phone ? 'phone-error' : undefined}
          disabled={disabled || submitting}
          onChange={(event) => updateField('phone', event.target.value)}
        />
      </FormField>

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
            onChange={(event) => updateField('city', event.target.value)}
          />
        </FormField>
        <FormField id="state" label={copy.stateLabel} required error={fieldErrors.state}>
          <select
            id="state"
            className={inputClassName('state')}
            value={form.state}
            autoComplete="address-level1"
            aria-required="true"
            aria-invalid={fieldErrors.state != null}
            aria-describedby={fieldErrors.state ? 'state-error' : undefined}
            disabled={disabled || submitting}
            onChange={(event) => updateField('state', event.target.value)}
          >
            <option value="">{copy.statePlaceholder}</option>
            {stateOptions.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
        </FormField>
        <FormField id="postalCode" label={copy.postalCodeLabel} required error={fieldErrors.postalCode}>
          <input
            id="postalCode"
            type="text"
            className={inputClassName('postalCode')}
            value={form.postalCode}
            autoComplete="postal-code"
            inputMode="numeric"
            aria-required="true"
            aria-invalid={fieldErrors.postalCode != null}
            aria-describedby={fieldErrors.postalCode ? 'postalCode-error' : undefined}
            disabled={disabled || submitting}
            onChange={(event) => updateField('postalCode', event.target.value)}
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
