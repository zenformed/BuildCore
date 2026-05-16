'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { User } from '@/domain/entities/User';

export interface UseUserAvatarState {
  avatarUrl: string | null;
  hasPhoto: boolean;
  isLoading: boolean;
  refetch: () => Promise<void>;
}

/**
 * Hook to get current user avatar URL and photo status.
 * Fetches /api/auth/me for hasPhoto; loads image via authenticated GET /api/auth/avatar.
 * In SaaS mode pass getAccessToken so the BFF can reach ZenformedCore.
 */
export function useUserAvatar(user: User | null, getAccessToken?: () => string | null): UseUserAvatarState {
  const [hasPhoto, setHasPhoto] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [version, setVersion] = useState(0);
  const blobUrlRef = useRef<string | null>(null);

  const revokeBlobUrl = useCallback(() => {
    if (blobUrlRef.current != null) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
  }, []);

  const getAccessTokenRef = useRef(getAccessToken);
  getAccessTokenRef.current = getAccessToken;

  const fetchPhotoStatus = useCallback(async () => {
    if (!user?.email) {
      setHasPhoto(false);
      setIsLoading(false);
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
    } finally {
      setIsLoading(false);
    }
  }, [user?.email]);

  useEffect(() => {
    if (!user?.email) {
      setHasPhoto(false);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    fetchPhotoStatus();
  }, [user?.email, fetchPhotoStatus]);

  useEffect(() => {
    if (!user?.email || !hasPhoto) {
      revokeBlobUrl();
      setAvatarUrl(null);
      return;
    }

    let cancelled = false;
    const loadImage = async () => {
      try {
        const token = getAccessTokenRef.current?.() ?? null;
        const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
        const res = await fetch(`/api/auth/avatar?t=${version}`, {
          credentials: 'include',
          headers,
        });
        if (cancelled) return;
        if (!res.ok) {
          revokeBlobUrl();
          setAvatarUrl(null);
          return;
        }
        const blob = await res.blob();
        if (cancelled) return;
        revokeBlobUrl();
        const url = URL.createObjectURL(blob);
        blobUrlRef.current = url;
        setAvatarUrl(url);
      } catch {
        if (!cancelled) {
          revokeBlobUrl();
          setAvatarUrl(null);
        }
      }
    };
    void loadImage();
    return () => {
      cancelled = true;
    };
  }, [user?.email, hasPhoto, version, revokeBlobUrl]);

  useEffect(() => {
    return () => {
      revokeBlobUrl();
    };
  }, [revokeBlobUrl]);

  const refetch = useCallback(async () => {
    setVersion((v) => v + 1);
    await fetchPhotoStatus();
  }, [fetchPhotoStatus]);

  return { avatarUrl, hasPhoto, isLoading, refetch };
}
