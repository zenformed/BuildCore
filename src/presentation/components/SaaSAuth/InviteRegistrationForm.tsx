'use client';

import React, { useState } from 'react';
import { Button } from '@/presentation/components/Button';
import { authFormStyles as formStyles } from '@zenformed/core/auth';

const MIN_PASSWORD_LENGTH = 8;

export interface InviteRegistrationFormProps {
  readonly email: string;
  readonly onSubmit: (password: string, confirmPassword: string) => Promise<void>;
  readonly error?: string | null;
}

export function InviteRegistrationForm({
  email,
  onSubmit,
  error,
}: InviteRegistrationFormProps): React.ReactElement {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setSubmitError(null);

    if (password.length < MIN_PASSWORD_LENGTH) {
      setSubmitError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (password !== confirmPassword) {
      setSubmitError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(password, confirmPassword);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Could not create account.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className={formStyles.form}>
      <label htmlFor="invite-register-email" className={formStyles.label}>
        Email
      </label>
      <input
        id="invite-register-email"
        type="email"
        value={email}
        readOnly
        autoComplete="email"
        className={formStyles.inputReadOnly}
      />
      <label htmlFor="invite-register-password" className={formStyles.label}>
        Password
      </label>
      <input
        id="invite-register-password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        minLength={MIN_PASSWORD_LENGTH}
        autoComplete="new-password"
        className={formStyles.input}
      />
      <label htmlFor="invite-register-confirm-password" className={formStyles.label}>
        Confirm password
      </label>
      <input
        id="invite-register-confirm-password"
        type="password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        required
        minLength={MIN_PASSWORD_LENGTH}
        autoComplete="new-password"
        className={formStyles.input}
      />
      {error ?? submitError ? (
        <p className={formStyles.error} role="alert">
          {error ?? submitError}
        </p>
      ) : null}
      <Button type="submit" disabled={submitting} className={formStyles.submit}>
        {submitting ? 'Creating account…' : 'Create account'}
      </Button>
    </form>
  );
}
