import { createClient, type SupabaseClient } from '@supabase/supabase-js';

function readServiceRoleEnv(): { url: string; serviceKey: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceKey) return null;
  return { url, serviceKey };
}

/** Service-role Supabase client for unauthenticated public CRM routes (bypasses RLS). */
export function createCrmServiceRoleClient(): SupabaseClient | null {
  const env = readServiceRoleEnv();
  if (env == null) return null;
  return createClient(env.url, env.serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
