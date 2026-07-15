'use client';

import type { ReactElement } from 'react';
import { useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  pickDashboardPageLoadingClassNames,
  ZenformedDashboardPageLoading,
  ZenformedNotificationsPage,
} from '@zenformed/core/dashboard-shell';
import { runtimeModes } from '@/infrastructure/config/runtimeModes';
import { createBuildCoreNotificationsApi } from '@/infrastructure/notifications/createBuildCoreNotificationsApi';
import { navigateNotificationDestination } from '@/presentation/features/notifications/navigateNotificationDestination';
import { useSaaSProfile } from '@/presentation/hooks/useSaaSProfile';
import styles from '../dashboard/dashboard.module.css';

const pageLoadingClassNames = pickDashboardPageLoadingClassNames(styles);

export default function NotificationsPage(): ReactElement {
  const router = useRouter();
  const { session, organizationMembershipContext, membershipContextStatus } = useSaaSProfile();

  const api = useMemo(
    () =>
      createBuildCoreNotificationsApi(
        () => (runtimeModes.isSaasMode() ? session?.access_token ?? null : null)
      ),
    [session?.access_token]
  );

  const onNavigate = useCallback(
    (destinationUrl: string) => {
      navigateNotificationDestination(destinationUrl, {
        push: (href) => router.push(href),
      });
    },
    [router]
  );

  if (runtimeModes.isDemoRuntime()) {
    return (
      <div className={styles.page}>
        <h1>Notifications</h1>
        <p>Notifications are not available in demo mode.</p>
      </div>
    );
  }

  if (membershipContextStatus === 'pending') {
    return (
      <ZenformedDashboardPageLoading
        classNames={pageLoadingClassNames}
        message="Loading notifications…"
      />
    );
  }

  const organizationId = organizationMembershipContext?.organizationId?.trim() ?? '';
  if (!organizationId || !organizationMembershipContext?.hasActiveMembership) {
    return (
      <div className={styles.page}>
        <h1>Notifications</h1>
        <p>Join an organization to view notifications.</p>
      </div>
    );
  }

  return (
    <ZenformedNotificationsPage
      organizationId={organizationId}
      api={api}
      onNavigate={onNavigate}
    />
  );
}
