/**
 * Fetch wrapper for CRM API Supabase clients.
 * Vercel/Node may cache Supabase PostgREST GET responses unless cache is disabled explicitly.
 */
export function crmSupabaseNoStoreFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const headers = new Headers(init?.headers);
  headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  headers.set('Pragma', 'no-cache');

  return fetch(input, {
    ...init,
    headers,
    cache: 'no-store',
  });
}
