'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { User } from '@/domain/entities/User';
import { deferNonCriticalWork } from '@/presentation/utils/deferNonCriticalWork';
import {
  loadSessionBlob,
  peekSessionBlobUrl,
} from '@/presentation/utils/sessionBlobCache';

export interface UseUserAvatarState {
  avatarUrl: string | null;
  hasPhoto: boolean;
  isLoading: boolean;
  refetch: () => Promise<void>;
}

function selfAvatarCacheKey(version: number): string {
  return `auth-avatar:self:${version}`;
}

/**
 * Hook to get current user avatar URL and photo status.
 * Fetches /api/auth/me for hasPhoto; loads image via authenticated GET /api/auth/avatar.
 * Non-blocking: shows initials until deferred blob load completes.
 */
export function useUserAvatar(user: User | null, getAccessToken?: () => string | null): UseUserAvatarState {
  const [hasPhoto, setHasPhoto] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [version, setVersion] = useState(0);

  const getAccessTokenRef = useRef(getAccessToken);
  getAccessTokenRef.current = getAccessToken;

  const fetchPhotoStatus = useCallback(async () => {
    if (!user?.email) {
      setHasPhoto(false);
      return;
    }
    try {
      const token = getAccessTokenRef.current?.() ?? null;
      const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch('/api/auth/me', { credentials: 'include', headers });
      const data = await res.json();
      setHasPhoto(Boolean(data.hasPhoto));
    } catch {
      setHasPhoto(false);
    }
  }, [user?.email]);

  useEffect(() => {
    if (!user?.email) {
      setHasPhoto(false);
      setAvatarUrl(null);
      return;
    }
    return deferNonCriticalWork(() => {
      void fetchPhotoStatus();
    });
  }, [user?.email, fetchPhotoStatus]);

  useEffect(() => {
    if (!user?.email || !hasPhoto) {
      setAvatarUrl(null);
      return;
    }

    const cacheKey = selfAvatarCacheKey(version);
    const cached = peekSessionBlobUrl(cacheKey);
    if (cached !== undefined) {
      setAvatarUrl(cached);
      return;
    }

    let cancelled = false;
    const cancelDefer = deferNonCriticalWork(() => {
      void loadSessionBlob(cacheKey, async () => {
        const token = getAccessTokenRef.current?.() ?? null;
        const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
        const res = await fetch(`/api/auth/avatar?t=${version}`, {
          credentials: 'include',
          headers,
        });
        if (!res.ok) return null;
        return res.blob();
      }).then((url) => {
        if (!cancelled) setAvatarUrl(url);
      });
    });

    return () => {
      cancelled = true;
      cancelDefer();
    };
  }, [user?.email, hasPhoto, version]);

  const refetch = useCallback(async () => {
    setVersion((v) => v + 1);
    setIsLoading(true);
    try {
      await fetchPhotoStatus();
    } finally {
      setIsLoading(false);
    }
  }, [fetchPhotoStatus]);

  return { avatarUrl, hasPhoto, isLoading, refetch };
}
