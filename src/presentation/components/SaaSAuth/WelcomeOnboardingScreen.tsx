'use client';

import React, { useCallback, useState } from 'react';
import { runtimeModes } from '@/infrastructure/config/runtimeModes';
import { getSupabaseClient } from '@/infrastructure/supabase/supabaseClient';
import { Button } from '@/presentation/components/Button';
import styles from './SaaSAuth.module.css';

const INDUSTRY_OPTIONS = [
  { value: 'technology', label: 'Technology' },
  { value: 'services', label: 'Services' },
  { value: 'other', label: 'Other' },
] as const;

export interface WelcomeOnboardingScreenProps {
  onSuccess: () => void;
}

export function WelcomeOnboardingScreen({ onSuccess }: WelcomeOnboardingScreenProps): React.ReactElement {
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState<string>('cnc');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const name = companyName.trim();
      if (!name) {
        setError('Company name is required');
        return;
      }
      setError(null);
      setLoading(true);
      try {
        const supabase = getSupabaseClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          setError('Session expired');
          setLoading(false);
          return;
        }
        const { user } = session;
        const accessToken = session.access_token;

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
              body: JSON.stringify({ companyName: name, industry }),
            });

            if (relayRes.status === 401) {
              setError('Session expired');
              setLoading(false);
              return;
            }

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
         * @deprecated Temporary — direct browser `profiles` update when ZenformedCore relay is unset
         * or failed (same columns as Core **`PATCH /users/me/profile`**).
         */
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ company_name: name, industry, updated_at: new Date().toISOString() })
          .eq('id', user.id);
        if (updateError) {
          setError(updateError.message);
          setLoading(false);
          return;
        }
        onSuccess();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Save failed');
      } finally {
        setLoading(false);
      }
    },
    [companyName, industry, onSuccess]
  );

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>Welcome! Let&apos;s set up your shop</h1>
        <p className={styles.message}>Tell us your company name and type of work so we can personalize your experience.</p>
        <form onSubmit={handleSubmit}>
          {error ? <div className={styles.error} role="alert">{error}</div> : null}
          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="saas-company">Company name</label>
            <input
              id="saas-company"
              type="text"
              className={styles.input}
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Acme Manufacturing"
              autoComplete="organization"
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="saas-industry">Industry</label>
            <select
              id="saas-industry"
              className={styles.select}
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
            >
              {INDUSTRY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div className={styles.actions}>
            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? 'Saving…' : 'Continue'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
