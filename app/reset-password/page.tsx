'use client';

import { useEffect, useState, type ReactElement } from 'react';
import {
  DEFAULT_AUTH_LABELS,
  ZenformedAuthNavLink,
  ZenformedAuthPageLinks,
  ZenformedRecoveryPasswordForm,
  authFormStyles as formStyles,
  updateRecoveredPassword,
} from '@zenformed/core/auth';
import { AuthPageShell } from '@/presentation/components/SaaSAuth/AuthPageShell';
import { buildCoreDashboardNavigation as nav } from '@/platform/navigation/buildCoreDashboardNavigation';
import { getSupabaseClient } from '@/infrastructure/supabase/supabaseClient';

type RecoveryStatus = 'loading' | 'ready' | 'invalid';

function hasRecoveryCallback(): boolean {
  if (typeof window === 'undefined') return false;
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  return hashParams.get('type') === 'recovery';
}

export default function ResetPasswordPage(): ReactElement {
  const [status, setStatus] = useState<RecoveryStatus>('loading');

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;
    const supabase = getSupabaseClient();

    async function resolveRecoveryStatus(): Promise<void> {
      if (hasRecoveryCallback()) {
        await new Promise((resolve) => window.setTimeout(resolve, 250));
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;

      if (session) {
        setStatus('ready');
        return;
      }

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((event, newSession) => {
        if (cancelled) return;
        if (event === 'PASSWORD_RECOVERY' || newSession) {
          setStatus('ready');
        }
      });
      unsubscribe = () => subscription.unsubscribe();

      window.setTimeout(async () => {
        if (cancelled) return;
        const {
          data: { session: delayedSession },
        } = await supabase.auth.getSession();
        if (cancelled) return;
        setStatus(delayedSession ? 'ready' : 'invalid');
      }, 750);
    }

    void resolveRecoveryStatus();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  if (status === 'loading') {
    return (
      <AuthPageShell
        cardTitle={DEFAULT_AUTH_LABELS.resetPasswordTitle}
        loading
        loadingMessage="Verifying reset link…"
      >
        {null}
      </AuthPageShell>
    );
  }

  if (status === 'invalid') {
    return (
      <AuthPageShell cardTitle={DEFAULT_AUTH_LABELS.resetPasswordTitle}>
        <p className={formStyles.error} role="alert">
          {DEFAULT_AUTH_LABELS.resetPasswordInvalidLink}
        </p>
        <ZenformedAuthPageLinks align="center">
          <ZenformedAuthNavLink href={nav.routes.forgotPassword}>
            {DEFAULT_AUTH_LABELS.sendResetLink}
          </ZenformedAuthNavLink>
          <ZenformedAuthNavLink href={nav.routes.login}>
            {DEFAULT_AUTH_LABELS.backToSignIn}
          </ZenformedAuthNavLink>
        </ZenformedAuthPageLinks>
      </AuthPageShell>
    );
  }

  return (
    <AuthPageShell cardTitle={DEFAULT_AUTH_LABELS.resetPasswordTitle}>
      <ZenformedRecoveryPasswordForm
        loginHref={nav.routes.login}
        onUpdatePassword={async (password) =>
          updateRecoveredPassword({
            supabase: getSupabaseClient(),
            password,
          })
        }
      />
    </AuthPageShell>
  );
}
