import { resolveAuthRedirectUrl } from '@zenformed/core/auth';
import { env } from '@/infrastructure/config/env';
import { buildCoreDashboardNavigation as nav } from '@/platform/navigation/buildCoreDashboardNavigation';

/** Absolute Supabase `redirectTo` for BuildCore password recovery emails. */
export function resolveBuildCorePasswordResetRedirectUrl(): string {
  return resolveAuthRedirectUrl({
    appOrigin: env.appUrl,
    path: nav.routes.resetPassword,
  });
}
