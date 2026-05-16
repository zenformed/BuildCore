/**
 * Server-only Supabase helpers for API routes.
 * Use to verify Supabase JWT and get user; do not import from client code.
 */

import { createClient, type User } from '@supabase/supabase-js';

function getEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return { url, key };
}

/**
 * Get Supabase user from a Bearer token (e.g. Authorization: Bearer <access_token>).
 * Returns null if env is missing, token is invalid, or user cannot be resolved.
 */
export async function getSupabaseUserFromToken(bearerToken: string | null): Promise<User | null> {
  const env = getEnv();
  if (!env) return null;
  if (!bearerToken?.startsWith('Bearer ')) return null;
  const token = bearerToken.slice(7).trim();
  if (!token) return null;

  const supabase = createClient(env.url, env.key);
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user;
}
