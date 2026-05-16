'use client';

import React, { useState } from 'react';
import { Button } from '@/presentation/components/Button';
import styles from './LoginForm.module.css';

export interface LoginFormProps {
  onSubmit: (email: string, password: string) => Promise<void>;
  error?: string | null;
}

/**
 * Controlled login form. No inline styles; uses CSS Module.
 */
export function LoginForm({ onSubmit, error }: LoginFormProps): React.ReactElement {
  const [email, setEmail] = useState('');
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
    <form onSubmit={handleSubmit} className={styles.form}>
      <label htmlFor="login-email" className={styles.label}>
        Email
      </label>
      <input
        id="login-email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        autoComplete="email"
        className={styles.input}
      />
      <label htmlFor="login-password" className={styles.label}>
        Password
      </label>
      <input
        id="login-password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        autoComplete="current-password"
        className={styles.input}
      />
      {error ?? submitError ? <p className={styles.error} role="alert">{error ?? submitError}</p> : null}
      <Button type="submit" disabled={submitting} className={styles.submit}>
        {submitting ? 'Signing in…' : 'Sign in'}
      </Button>
    </form>
  );
}
