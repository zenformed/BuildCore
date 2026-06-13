import { waitForSupabaseAuthSessionSync } from '@zenformed/core/auth';
import { getSupabaseClient } from '@/infrastructure/supabase/supabaseClient';

/** Waits until the shared Supabase auth client exposes a session access token. */
export async function waitForAuthSessionSync(): Promise<void> {
  await waitForSupabaseAuthSessionSync(getSupabaseClient());
}
