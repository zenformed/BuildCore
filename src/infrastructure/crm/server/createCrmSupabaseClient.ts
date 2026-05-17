import { createClient, type SupabaseClient } from '@supabase/supabase-js';

function getEnv(): { url: string; key: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return { url, key };
}

/**
 * Supabase client scoped to the caller JWT (RLS applies). Never use service role here.
 */
export function createCrmSupabaseClient(authHeader: string): SupabaseClient | null {
  const env = getEnv();
  if (!env) return null;
  return createClient(env.url, env.key, {
    global: { headers: { Authorization: authHeader } },
  });
}
