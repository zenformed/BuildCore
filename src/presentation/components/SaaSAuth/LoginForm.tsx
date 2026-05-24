'use client';

import React, { useState } from 'react';
import { Button } from '@/presentation/components/Button';
import { authFormStyles as formStyles } from '@zenformed/core/auth';

export interface LoginFormProps {
  onSubmit: (email: string, password: string) => Promise<void>;
  error?: string | null;
  initialEmail?: string;
  emailReadOnly?: boolean;
  submitLabel?: string;
  submittingLabel?: string;
}

export function LoginForm({
  onSubmit,
  error,
  initialEmail = '',
  emailReadOnly = false,
  submitLabel = 'Sign in',
  submittingLabel = 'Signing in…',
}: LoginFormProps): React.ReactElement {
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setSubmitError(null);
    setSubmitting(true);
    try {
      await onSubmit(email, password);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Sign in failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className={formStyles.form}>
      <label htmlFor="login-email" className={formStyles.label}>
        Email
      </label>
      <input
        id="login-email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        readOnly={emailReadOnly}
        autoComplete="email"
        className={emailReadOnly ? formStyles.inputReadOnly : formStyles.input}
      />
      <label htmlFor="login-password" className={formStyles.label}>
        Password
      </label>
      <input
        id="login-password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        autoComplete="current-password"
        className={formStyles.input}
      />
      {error ?? submitError ? (
        <p className={formStyles.error} role="alert">
          {error ?? submitError}
        </p>
      ) : null}
      <Button type="submit" disabled={submitting} className={formStyles.submit}>
        {submitting ? submittingLabel : submitLabel}
      </Button>
    </form>
  );
}
