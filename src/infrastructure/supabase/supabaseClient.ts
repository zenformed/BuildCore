/**
 * Supabase client for Cloud Bouncer (Electron + web).
 * Use getSupabaseClient() for a singleton. For Electron, restore session from main via setSession().
 */
import { getOrCreateBrowserSupabaseAuthClient } from '@zenformed/core';
import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { env } from '@/infrastructure/config/env';

/**
 * Auth client uses **`autoRefreshToken: true`**. Visible-tab refresh emits **`TOKEN_REFRESHED`**; **`SaaSProfileProvider`**
 * swaps tokens in React state without full profile/bootstrap HTTP — keep auto-refresh enabled.
 */
export function getSupabaseClient(): SupabaseClient {
  return getOrCreateBrowserSupabaseAuthClient({
    url: env.supabaseUrl,
    anonKey: env.supabaseAnonKey,
    storageKey: 'buildcore-auth',
  }) as unknown as SupabaseClient;
}

/** Minimal session shape for restore (e.g. from Electron safeStorage). Supabase setSession only needs tokens. */
export type SessionLike = { access_token: string; refresh_token?: string | null };

/**
 * Restore session from Electron main (safeStorage-decrypted).
 * Call after getSupabaseClient() so the client uses this session.
 */
export async function setSession(session: Session | SessionLike): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.setSession({
    access_token: session.access_token,
    refresh_token: session.refresh_token ?? '',
  });
  if (error) throw error;
}

/**
 * Get current session (e.g. to send to main for encrypted storage).
 */
export async function getSession(): Promise<Session | null> {
  const {
    data: { session },
  } = await getSupabaseClient().auth.getSession();
  return session;
}

export type { Session, SupabaseClient };
