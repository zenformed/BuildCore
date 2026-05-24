'use client';

import type { ReactElement } from 'react';
import {
  DEFAULT_AUTH_LABELS,
  ZenformedForgotPasswordPlaceholder,
} from '@zenformed/core/auth';
import { AuthPageShell } from '@/presentation/components/SaaSAuth/AuthPageShell';
import { buildCoreDashboardNavigation as nav } from '@/platform/navigation/buildCoreDashboardNavigation';

export default function ForgotPasswordPage(): ReactElement {
  return (
    <AuthPageShell cardTitle={DEFAULT_AUTH_LABELS.forgotPasswordTitle}>
      <ZenformedForgotPasswordPlaceholder loginHref={nav.routes.login} />
    </AuthPageShell>
  );
}
