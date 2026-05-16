/**
 * Auth session synchronization helper.
 * Keeps Supabase session-read details out of presentation hooks.
 */
export async function waitForAuthSessionSync(): Promise<void> {
  try {
    const { getSupabaseClient } = await import('@/infrastructure/supabase/supabaseClient');
    const supabase = getSupabaseClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.access_token) return;

    await new Promise<void>((resolve) => {
      let settled = false;
      const finish = (): void => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        subscription.unsubscribe();
        resolve();
      };
      const timeout = setTimeout(finish, 5000);
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((event, nextSession) => {
        if (
          (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') &&
          nextSession?.access_token
        ) {
          finish();
        }
      });
    });
  } catch {
    // Non-SaaS/local auth paths may not need Supabase session sync.
  }
}
