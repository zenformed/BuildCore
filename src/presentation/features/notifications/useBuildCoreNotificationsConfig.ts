'use client';

import { useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { ZenformedDashboardNotificationsConfig } from '@zenformed/core/dashboard-shell';
import { runtimeModes } from '@/infrastructure/config/runtimeModes';
import { createBuildCoreNotificationsApi } from '@/infrastructure/notifications/createBuildCoreNotificationsApi';
import { shouldEnableBuildCoreNotifications } from '@/presentation/features/notifications/buildCoreNotificationsConfigGate';
import { navigateNotificationDestination } from '@/presentation/features/notifications/navigateNotificationDestination';
import { useSaaSProfile } from '@/presentation/hooks/useSaaSProfile';

const NOTIFICATIONS_PAGE_HREF = '/notifications';

/**
 * Opt-in shared-header notifications config.
 * Null when demo, unauthenticated, or active organization is not ready.
 *
 * API adapter identity is stable across token/session refreshes so the shared
 * unread-count controller is not continuously reset.
 */
export function useBuildCoreNotificationsConfig(
  getAccessToken: () => string | null
): ZenformedDashboardNotificationsConfig | null {
  const router = useRouter();
  const { organizationMembershipContext, membershipContextStatus, session } = useSaaSProfile();

  const getAccessTokenRef = useRef(getAccessToken);
  getAccessTokenRef.current = getAccessToken;

  const api = useMemo(
    () => createBuildCoreNotificationsApi(() => getAccessTokenRef.current()),
    []
  );

  const onNavigate = useCallback(
    (destinationUrl: string) => {
      navigateNotificationDestination(destinationUrl, {
        push: (href) => router.push(href),
      });
    },
    [router]
  );

  const hasAccessToken = Boolean(session?.access_token);
  const organizationId = organizationMembershipContext?.organizationId?.trim() ?? '';
  const hasActiveMembership = Boolean(organizationMembershipContext?.hasActiveMembership);

  return useMemo(() => {
    if (
      !shouldEnableBuildCoreNotifications({
        isDemoRuntime: runtimeModes.isDemoRuntime(),
        isSaasMode: runtimeModes.isSaasMode(),
        useMockAuth: runtimeModes.useMockAuth(),
        hasAccessToken,
        membershipContextStatus,
        organizationId,
        hasActiveMembership,
      })
    ) {
      return null;
    }

    return {
      organizationId,
      api,
      notificationsPageHref: NOTIFICATIONS_PAGE_HREF,
      onNavigate,
    };
  }, [
    api,
    hasAccessToken,
    hasActiveMembership,
    membershipContextStatus,
    onNavigate,
    organizationId,
  ]);
}

export { NOTIFICATIONS_PAGE_HREF };
