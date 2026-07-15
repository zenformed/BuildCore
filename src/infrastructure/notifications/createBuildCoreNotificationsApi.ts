'use client';

import {
  createZenformedNotificationsApi,
  type ZenformedNotificationsApi,
} from '@zenformed/core/dashboard-shell';
import {
  BUILDCORE_NOTIFICATIONS_CORE_STYLE_BASE,
  mapCoreNotificationsUrlToBuildCoreBff,
} from '@/infrastructure/notifications/mapCoreNotificationsUrlToBff';

/**
 * BuildCore browser adapter for shared package notification APIs.
 * Calls flat `/api/internal/notifications*` BFF routes (Bearer required).
 * Active organization is resolved on the server from membership context.
 */
export function createBuildCoreNotificationsApi(
  getAccessToken: () => string | null | undefined
): ZenformedNotificationsApi {
  return createZenformedNotificationsApi({
    baseUrl: BUILDCORE_NOTIFICATIONS_CORE_STYLE_BASE,
    getAccessToken,
    fetchImpl: async (input, init) => {
      const rewritten = mapCoreNotificationsUrlToBuildCoreBff(String(input));
      return fetch(rewritten, init);
    },
  });
}
