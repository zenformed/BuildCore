'use client';

import { useEffect } from 'react';
import { setSession } from '@/infrastructure/supabase/supabaseClient';
import { env } from '@/infrastructure/config/env';

/**
 * When running inside Electron, restore the Supabase session from main process (safeStorage)
 * so the renderer's Supabase client is authenticated and the user doesn't have to log in again.
 */
export function ElectronSessionBridge(): React.ReactElement | null {
  useEffect(() => {
    if (typeof window === 'undefined' || env.useMockAuth) return;
    const electronAuth = window.electronAuth;
    if (!electronAuth?.getSession) return;

    let cancelled = false;
    electronAuth.getSession().then((stored) => {
      if (cancelled || !stored?.access_token) return;
      setSession({
        access_token: stored.access_token,
        refresh_token: stored.refresh_token ?? '',
        expires_at: stored.expires_at,
      }).catch(() => {
        // Session may be expired; ignore
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
