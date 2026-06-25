'use client';

import type { FormEvent, ReactElement } from 'react';
import { useState } from 'react';
import { US_STATE_CODES } from '@/domain/crm/usStates';
import type { LeadCaptureSubmitInput } from '@/domain/lead/leadCapture';
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

export function LeadCaptureForm({
  disabled = false,
  submitting = false,
  onSubmit,
}: LeadCaptureFormProps): ReactElement {
  const copy = content.leadCapture.form;
  const [form, setForm] = useState<LeadCaptureFormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);

  const updateField = <K extends keyof LeadCaptureFormState>(key: K, value: LeadCaptureFormState[K]): void => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (disabled || submitting) return;

    setError(null);
    try {
      await onSubmit({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phone: form.phone,
        addressLine1: form.addressLine1,
        addressLine2: form.addressLine2.trim() ? form.addressLine2.trim() : null,
        city: form.city,
        state: form.state,
        postalCode: form.postalCode,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.submitFailed);
    }
  };

  const stateOptions = [...US_STATE_CODES].sort();

  return (
    <form className={styles.form} onSubmit={(event) => void handleSubmit(event)} noValidate>
      <div className={styles.fieldGrid}>
        <label className={styles.field}>
          <span className={styles.label}>{copy.firstNameLabel}</span>
          <input
            type="text"
            className={styles.input}
            value={form.firstName}
            autoComplete="given-name"
            required
            disabled={disabled || submitting}
            onChange={(event) => updateField('firstName', event.target.value)}
          />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>{copy.lastNameLabel}</span>
          <input
            type="text"
            className={styles.input}
            value={form.lastName}
            autoComplete="family-name"
            required
            disabled={disabled || submitting}
            onChange={(event) => updateField('lastName', event.target.value)}
          />
        </label>
      </div>

      <label className={styles.field}>
        <span className={styles.label}>{copy.emailLabel}</span>
        <input
          type="email"
          className={styles.input}
          value={form.email}
          autoComplete="email"
          inputMode="email"
          required
          disabled={disabled || submitting}
          onChange={(event) => updateField('email', event.target.value)}
        />
      </label>

      <label className={styles.field}>
        <span className={styles.label}>{copy.phoneLabel}</span>
        <input
          type="tel"
          className={styles.input}
          value={form.phone}
          autoComplete="tel"
          inputMode="tel"
          required
          disabled={disabled || submitting}
          onChange={(event) => updateField('phone', event.target.value)}
        />
      </label>

      <label className={styles.field}>
        <span className={styles.label}>{copy.addressLine1Label}</span>
        <input
          type="text"
          className={styles.input}
          value={form.addressLine1}
          autoComplete="address-line1"
          required
          disabled={disabled || submitting}
          onChange={(event) => updateField('addressLine1', event.target.value)}
        />
      </label>

      <label className={styles.field}>
        <span className={styles.label}>{copy.addressLine2Label}</span>
        <input
          type="text"
          className={styles.input}
          value={form.addressLine2}
          autoComplete="address-line2"
          disabled={disabled || submitting}
          onChange={(event) => updateField('addressLine2', event.target.value)}
        />
      </label>

      <div className={styles.fieldGrid}>
        <label className={styles.field}>
          <span className={styles.label}>{copy.cityLabel}</span>
          <input
            type="text"
            className={styles.input}
            value={form.city}
            autoComplete="address-level2"
            required
            disabled={disabled || submitting}
            onChange={(event) => updateField('city', event.target.value)}
          />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>{copy.stateLabel}</span>
          <select
            className={styles.input}
            value={form.state}
            autoComplete="address-level1"
            required
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
        </label>
        <label className={styles.field}>
          <span className={styles.label}>{copy.postalCodeLabel}</span>
          <input
            type="text"
            className={styles.input}
            value={form.postalCode}
            autoComplete="postal-code"
            inputMode="numeric"
            required
            disabled={disabled || submitting}
            onChange={(event) => updateField('postalCode', event.target.value)}
          />
        </label>
      </div>

      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}

      <button type="submit" className={styles.submitBtn} disabled={disabled || submitting}>
        {submitting ? copy.submitting : copy.submit}
      </button>
    </form>
  );
}
