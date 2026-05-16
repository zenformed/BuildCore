import { getSupabaseClient } from '@/infrastructure/supabase/supabaseClient';

/**
 * Remediate stale SaaS session state where auth session exists but no profile row is available.
 *
 * Behavior:
 * 1) sign out Supabase session
 * 2) clear Electron persisted auth session when available
 * 3) redirect caller should happen after this promise resolves/finallys in the gate
 */
export async function remediateStaleSaasSession(): Promise<void> {
  await getSupabaseClient().auth.signOut();
  if (typeof window !== 'undefined' && window.electronAuth?.clearSession) {
    await window.electronAuth.clearSession();
  }
}

