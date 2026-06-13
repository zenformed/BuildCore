'use client';

import { useState, type ReactElement } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import {
  DEFAULT_AUTH_LABELS,
  ZenformedAuthNavLink,
  ZenformedAuthPageLinks,
  buildAuthEntryHref,
  parseAuthEntryQueryParams,
  resolvePostAuthRedirectTarget,
} from '@zenformed/core/auth';
import { useAuth } from '@/presentation/hooks/useAuth';
import { AuthPageShell } from '@/presentation/components/SaaSAuth/AuthPageShell';
import { LoginForm } from '@/presentation/components/SaaSAuth/LoginForm';
import { buildCoreDashboardNavigation as nav } from '@/platform/navigation/buildCoreDashboardNavigation';
import pageStyles from '@/presentation/components/SaaSAuth/authPage.module.css';

function LoginPageContent(): ReactElement {
  const { signIn, waitForSessionSync, isLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loggingIn, setLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const authEntryParams = parseAuthEntryQueryParams(searchParams);
  const redirectTarget = resolvePostAuthRedirectTarget(authEntryParams, nav.routes.dashboard);

  async function handleSubmit(email: string, password: string): Promise<void> {
    setLoggingIn(true);
    setLoginError(null);
    try {
      const result = await signIn(email, password);
      if (result.success) {
        await waitForSessionSync();
        router.replace(redirectTarget);
        return;
      }
      const extendedResult = result as { mustResetPassword?: boolean; error?: string };
      if (extendedResult.mustResetPassword) {
        setLoginError('Password reset required. Use your host app’s reset flow.');
        return;
      }
      const errorMessage = extendedResult.error ?? 'Sign in failed';
      setLoginError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoggingIn(false);
    }
  }

  return (
    <AuthPageShell
      cardTitle="Sign in"
      loading={isLoading || loggingIn}
      loadingMessage={isLoading ? 'Checking session…' : 'Logging in…'}
    >
      {!isLoading && !loggingIn ? (
        <>
          <LoginForm onSubmit={handleSubmit} error={loginError} />
          <ZenformedAuthPageLinks>
            <ZenformedAuthNavLink href={buildAuthEntryHref(nav.routes.forgotPassword, authEntryParams)}>
              {DEFAULT_AUTH_LABELS.forgotPassword}
            </ZenformedAuthNavLink>
          </ZenformedAuthPageLinks>
        </>
      ) : null}
    </AuthPageShell>
  );
}

export default function LoginPage(): ReactElement {
  return (
    <Suspense
      fallback={
        <div className={pageStyles.page}>
          <p className={pageStyles.loading}>Loading…</p>
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
