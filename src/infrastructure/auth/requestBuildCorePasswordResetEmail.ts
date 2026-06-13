import {
  DEFAULT_AUTH_LABELS,
  requestPasswordResetEmail,
  type RequestPasswordResetResult,
} from '@zenformed/core/auth';
import { getSupabaseClient } from '@/infrastructure/supabase/supabaseClient';
import { resolveBuildCorePasswordResetRedirectUrl } from '@/infrastructure/auth/buildCorePasswordResetRedirect';

/**
 * Single BuildCore entry point for Supabase password recovery emails.
 * Used by `/forgot-password` (login link and settings/account link both route there).
 */
export async function requestBuildCorePasswordResetEmail(
  email: string
): Promise<RequestPasswordResetResult> {
  const redirectTo = resolveBuildCorePasswordResetRedirectUrl();
  if (!redirectTo.trim()) {
    return { ok: false, error: DEFAULT_AUTH_LABELS.forgotPasswordError };
  }

  return requestPasswordResetEmail({
    supabase: getSupabaseClient(),
    email,
    redirectTo,
  });
}
