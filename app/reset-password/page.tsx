'use client';

import { type ReactElement } from 'react';
import {
  DEFAULT_AUTH_LABELS,
  ZenformedAuthNavLink,
  ZenformedAuthPageLinks,
  ZenformedRecoveryPasswordForm,
  authFormStyles as formStyles,
  updateRecoveredPassword,
  useZenformedPasswordRecoveryStatus,
} from '@zenformed/core/auth';
import { AuthPageShell } from '@/presentation/components/SaaSAuth/AuthPageShell';
import { buildCoreDashboardNavigation as nav } from '@/platform/navigation/buildCoreDashboardNavigation';
import { getSupabaseClient } from '@/infrastructure/supabase/supabaseClient';

export default function ResetPasswordPage(): ReactElement {
  const supabase = getSupabaseClient();
  const status = useZenformedPasswordRecoveryStatus(supabase);

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
            supabase,
            password,
          })
        }
      />
    </AuthPageShell>
  );
}
