'use client';

import { useZenformedUserAvatar } from '@zenformed/core/dashboard-shell';
import type {
  UseZenformedUserAvatarOptions,
  UseZenformedUserAvatarResult,
  ZenformedUserAvatarIdentity,
} from '@zenformed/core/dashboard-shell';
import type { User } from '@/domain/entities/User';
import { deferNonCriticalWork } from '@/presentation/utils/deferNonCriticalWork';
import { useOptionalDemoMode } from '@/presentation/providers/DemoModeProvider';
import {
  loadSessionBlob,
  peekSessionBlobUrl,
} from '@/presentation/utils/sessionBlobCache';

export type UseUserAvatarState = UseZenformedUserAvatarResult;

/**
 * Hook to get current user avatar URL and photo status.
 * Uses server avatarRevision for cache busting; session blob cache avoids duplicate fetches.
 */
export function useUserAvatar(user: User | null, getAccessToken?: () => string | null): UseUserAvatarState {
  const demoMode = useOptionalDemoMode();
  const identity: ZenformedUserAvatarIdentity | null = user?.email ? { email: user.email } : null;
  const options: UseZenformedUserAvatarOptions = {
    ...(getAccessToken ? { getAccessToken } : {}),
    peekAvatarBlob: peekSessionBlobUrl,
    loadAvatarBlob: (cacheKey, fetchBlob) =>
      new Promise((resolve) => {
        deferNonCriticalWork(() => {
          void loadSessionBlob(cacheKey, fetchBlob).then(resolve);
        });
      }),
  };
  const zenformedAvatar = useZenformedUserAvatar(identity, options);

  if (demoMode != null) {
    return demoMode.avatar;
  }

  return zenformedAvatar;
}
