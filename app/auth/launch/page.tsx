'use client';

import { Suspense, useEffect, useState, type ReactElement } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { waitForAuthSessionSync } from '@/infrastructure/auth/authSessionSync';
import { buildPlatformLoginUrl } from '@/infrastructure/auth/buildPlatformAuthEntryUrl';
import { setSession } from '@/infrastructure/supabase/supabaseClient';
import { AuthPageShell } from '@/presentation/components/SaaSAuth/AuthPageShell';
import pageStyles from '@/presentation/components/SaaSAuth/authPage.module.css';

function readErrorMessage(json: unknown, fallback: string): string {
  if (json != null && typeof json === 'object') {
    const o = json as Record<string, unknown>;
    if (typeof o.message === 'string' && o.message.trim()) return o.message;
    if (typeof o.error === 'string' && o.error.trim()) return o.error;
  }
  return fallback;
}

function sanitizeReturnPath(raw: string | null | undefined): string {
  if (raw == null || raw.trim() === '') return '/dashboard';
  const trimmed = raw.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) return '/dashboard';
  if (trimmed.includes('://') || trimmed.includes('\\')) return '/dashboard';
  return trimmed;
}

function LaunchHandoffContent(): ReactElement {
  const searchParams = useSearchParams();
  const router = useRouter();
  const code = searchParams.get('code')?.trim() ?? '';
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!code) {
      setError('Launch link is missing a code.');
      return;
    }

    let cancelled = false;

    async function exchangeAndRedirect(): Promise<void> {
      try {
        const res = await fetch('/api/internal/auth/app-launch/exchange', {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ code, targetApp: 'buildcore' }),
        });
        const json: unknown = await res.json();
        if (!res.ok) {
          if (!cancelled) {
            setError(readErrorMessage(json, 'Could not complete sign-in.'));
          }
          return;
        }

        if (json == null || typeof json !== 'object') {
          if (!cancelled) setError('Could not complete sign-in.');
          return;
        }

        const envelope = json as Record<string, unknown>;
        const session = envelope.session;
        if (session == null || typeof session !== 'object') {
          if (!cancelled) setError('Could not complete sign-in.');
          return;
        }
        const tokens = session as Record<string, unknown>;
        const accessToken = typeof tokens.access_token === 'string' ? tokens.access_token : '';
        const refreshToken = typeof tokens.refresh_token === 'string' ? tokens.refresh_token : '';
        if (!accessToken || !refreshToken) {
          if (!cancelled) setError('Could not complete sign-in.');
          return;
        }

        await setSession({ access_token: accessToken, refresh_token: refreshToken });
        await waitForAuthSessionSync();

        const returnPath = sanitizeReturnPath(
          typeof envelope.returnPath === 'string' ? envelope.returnPath : '/dashboard'
        );
        if (!cancelled) {
          router.replace(returnPath);
        }
      } catch {
        if (!cancelled) setError('Could not complete sign-in.');
      }
    }

    void exchangeAndRedirect();

    return () => {
      cancelled = true;
    };
  }, [code, router]);

  if (error) {
    return (
      <AuthPageShell cardTitle="Sign-in failed">
        <p className={pageStyles.error}>{error}</p>
        <p>
          <a href={buildPlatformLoginUrl()}>Return to sign in</a>
        </p>
      </AuthPageShell>
    );
  }

  return (
    <AuthPageShell minimal loading loadingMessage="Loading…" />
  );
}

export default function AuthLaunchPage(): ReactElement {
  return (
    <Suspense fallback={<AuthPageShell minimal loading loadingMessage="Loading…" />}>
      <LaunchHandoffContent />
    </Suspense>
  );
}
