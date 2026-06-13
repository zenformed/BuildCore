/** True when the current URL carries a Supabase password-recovery callback (hash or PKCE query). */
export function hasAuthRecoveryCallback(): boolean {
  if (typeof window === 'undefined') return false;

  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  if (hashParams.get('type') === 'recovery') return true;

  const queryParams = new URLSearchParams(window.location.search);
  if (queryParams.get('type') === 'recovery') return true;
  if (queryParams.has('code')) return true;

  return false;
}
