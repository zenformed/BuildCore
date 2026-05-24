'use client';

import { useCallback, type ReactElement } from 'react';
import {
  DEFAULT_AUTH_LABELS,
  ZenformedForgotPasswordForm,
  requestPasswordResetEmail,
  resolveAppOrigin,
  resolveAuthRedirectUrl,
} from '@zenformed/core/auth';
import { AuthPageShell } from '@/presentation/components/SaaSAuth/AuthPageShell';
import { buildCoreDashboardNavigation as nav } from '@/platform/navigation/buildCoreDashboardNavigation';
import { env } from '@/infrastructure/config/env';
import { getSupabaseClient } from '@/infrastructure/supabase/supabaseClient';

export default function ForgotPasswordPage(): ReactElement {
  const handleRequestReset = useCallback(async (email: string) => {
    const origin = resolveAppOrigin(env.appUrl);
    if (!origin) {
      return { ok: false as const, error: DEFAULT_AUTH_LABELS.forgotPasswordError };
    }
    const redirectTo = resolveAuthRedirectUrl({
      appOrigin: origin,
      path: nav.routes.resetPassword,
    });
    return requestPasswordResetEmail({
      supabase: getSupabaseClient(),
      email,
      redirectTo,
    });
  }, []);

  return (
    <AuthPageShell cardTitle={DEFAULT_AUTH_LABELS.forgotPasswordTitle}>
      <ZenformedForgotPasswordForm
        loginHref={nav.routes.login}
        onRequestReset={handleRequestReset}
      />
    </AuthPageShell>
  );
}
