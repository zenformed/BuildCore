'use client';

import React, { useCallback, useState } from 'react';
import { runtimeModes } from '@/infrastructure/config/runtimeModes';
import { getSupabaseClient } from '@/infrastructure/supabase/supabaseClient';
import { Button } from '@/presentation/components/Button';
import styles from './SaaSAuth.module.css';

export interface UpdatePasswordScreenProps {
  onSuccess: () => void;
}

export function UpdatePasswordScreen({ onSuccess }: UpdatePasswordScreenProps): React.ReactElement {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      if (password !== confirm) {
        setError('Passwords do not match');
        return;
      }
      if (password.length < 8) {
        setError('Password must be at least 8 characters');
        return;
      }
      setLoading(true);
      try {
        const supabase = getSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setError('Session expired');
          setLoading(false);
          return;
        }
        const { error: updateError } = await supabase.auth.updateUser({ password });
        if (updateError) {
          setError(updateError.message);
          setLoading(false);
          return;
        }

        const { data: { session } } = await supabase.auth.getSession();
        const accessToken = session?.access_token;
        const tryZenformedCoreRelay =
          runtimeModes.isSaasMode() && !runtimeModes.useMockAuth() && Boolean(accessToken);

        if (tryZenformedCoreRelay) {
          try {
            const relayRes = await globalThis.fetch('/api/internal/users-me-profile', {
              method: 'PATCH',
              headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                Authorization: `Bearer ${accessToken}`,
              },
              body: JSON.stringify({ forcePasswordReset: false }),
            });

            if (relayRes.ok) {
              const body = (await relayRes.json()) as { relay?: string };
              if (body.relay === 'zenformed_core') {
                onSuccess();
                return;
              }
            }
          } catch {
            /* fall through to temporary Supabase update */
          }
        }

        /**
         * @deprecated Temporary — direct `profiles` update when ZenformedCore relay is unset
         * or failed (same flag as Core **`PATCH /users/me/profile`**).
         */
        await supabase.from('profiles').update({ force_password_reset: false }).eq('id', user.id);
        onSuccess();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Update failed');
      } finally {
        setLoading(false);
      }
    },
    [password, confirm, onSuccess]
  );

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>Update your password</h1>
        <p className={styles.message}>You must set a new password before continuing.</p>
        <form onSubmit={handleSubmit}>
          {error ? <div className={styles.error} role="alert">{error}</div> : null}
          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="saas-pw-new">New password</label>
            <input
              id="saas-pw-new"
              type="password"
              className={styles.input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
              minLength={8}
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="saas-pw-confirm">Confirm password</label>
            <input
              id="saas-pw-confirm"
              type="password"
              className={styles.input}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              required
              minLength={8}
            />
          </div>
          <div className={styles.actions}>
            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? 'Updating…' : 'Update password'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
