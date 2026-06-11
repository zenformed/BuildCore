import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { crmSupabaseNoStoreFetch } from './crmSupabaseFetch';

function getEnv(): { url: string; key: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return { url, key };
}

/**
 * Supabase client scoped to the caller JWT (RLS applies). Never use service role here.
 * Uses no-store fetch so PostgREST reads are not served from the runtime HTTP cache.
 */
export function createCrmSupabaseClient(authHeader: string): SupabaseClient | null {
  const env = getEnv();
  if (!env) return null;
  return createClient(env.url, env.key, {
    global: {
      headers: { Authorization: authHeader },
      fetch: crmSupabaseNoStoreFetch,
    },
  });
}
