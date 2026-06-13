'use client';

import { useCallback, type ReactElement } from 'react';
import { DEFAULT_AUTH_LABELS, ZenformedForgotPasswordForm } from '@zenformed/core/auth';
import { AuthPageShell } from '@/presentation/components/SaaSAuth/AuthPageShell';
import { buildCoreDashboardNavigation as nav } from '@/platform/navigation/buildCoreDashboardNavigation';
import { requestBuildCorePasswordResetEmail } from '@/infrastructure/auth/requestBuildCorePasswordResetEmail';

export default function ForgotPasswordPage(): ReactElement {
  const handleRequestReset = useCallback(
    (email: string) => requestBuildCorePasswordResetEmail(email),
    []
  );

  return (
    <AuthPageShell cardTitle={DEFAULT_AUTH_LABELS.forgotPasswordTitle}>
      <ZenformedForgotPasswordForm
        loginHref={nav.routes.login}
        onRequestReset={handleRequestReset}
      />
    </AuthPageShell>
  );
}
