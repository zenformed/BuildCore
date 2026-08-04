/**
 * Server-only Supabase helpers for API routes.
 * Use to verify Supabase JWT and get user; do not import from client code.
 */

import type { User } from '@supabase/supabase-js';

function getEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return { url, key };
}

function isUserLike(value: unknown): value is User {
  return (
    value != null &&
    typeof value === 'object' &&
    'id' in value &&
    typeof (value as { id?: unknown }).id === 'string'
  );
}

function isConnectTimeoutError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const cause = (error as Error & { cause?: { code?: string } }).cause;
  return cause?.code === 'UND_ERR_CONNECT_TIMEOUT';
}

async function fetchSupabaseUser(
  url: string,
  key: string,
  token: string,
  timeoutMs: number
): Promise<User | null> {
  const response = await fetch(`${url}/auth/v1/user`, {
    method: 'GET',
    headers: {
      apikey: key,
      Authorization: `Bearer ${token}`,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
    },
    cache: 'no-store',
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) return null;
  const payload = (await response.json()) as unknown;
  return isUserLike(payload) ? payload : null;
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

  try {
    return await fetchSupabaseUser(env.url, env.key, token, 8000);
  } catch (error) {
    if (!isConnectTimeoutError(error)) return null;
  }

  try {
    // One retry for transient network/connect-timeout failures.
    return await fetchSupabaseUser(env.url, env.key, token, 12000);
  } catch {
    return null;
  }
}
