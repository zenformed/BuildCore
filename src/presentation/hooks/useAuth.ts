'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { User } from '@/domain/entities/User';
import { getCurrentUserUseCase } from '@/shared/di/container';
import type { SignInResult, SignUpResult } from '@/application/ports/IAuthService';
import { waitForAuthSessionSync } from '@/infrastructure/auth/authSessionSync';
import { useSaaSProfile } from '@/presentation/hooks/useSaaSProfile';

/**
 * Auth state returned by useAuth.
 * @expandable Add isLoading, error, or tenant list for switching.
 */
export interface UseAuthState {
  user: User | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<SignInResult>;
  signUp: (
    email: string,
    password: string,
    options?: { firstName?: string | null; lastName?: string | null }
  ) => Promise<SignUpResult>;
  /** Ensure client auth session has settled before redirect-dependent flows. */
  waitForSessionSync: () => Promise<void>;
  signOut: (options?: { redirectTo?: string | null }) => Promise<void>;
}

/**
 * Hook for authentication and current user/tenant context.
 * Uses GetCurrentUser and IAuthService from the composition root; no direct Supabase in UI.
 * @expandable Add refresh, tenant switch, or MFA methods.
 */
export function useAuth(): UseAuthState {
  const router = useRouter();
  const { profile: saasProfile } = useSaaSProfile();
  const [user, setUser] = useState<User | null>(null);
  /** SaaS gate already bootstrapped profile — do not block dashboard on useAuth remount after tab focus. */
  const [isLoading, setIsLoading] = useState(() => saasProfile == null);

  useEffect(() => {
    let cancelled = false;
    getCurrentUserUseCase.execute().then((u) => {
      if (!cancelled) {
        setUser(u);
        setIsLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string): Promise<SignInResult> => {
    const { authService } = await import('@/shared/di/container');
    const result = await authService.signIn(email, password);
    if (result.success && result.user) {
      setUser(result.user);
    }
    return result;
  }, []);

  const signUp = useCallback(
    async (
      email: string,
      password: string,
      options?: { firstName?: string | null; lastName?: string | null }
    ): Promise<SignUpResult> => {
      const { authService } = await import('@/shared/di/container');
      const result = await authService.signUp(email, password, options);
      if (result.success && result.user) {
        setUser(result.user);
      }
      return result;
    },
    []
  );

  const waitForSessionSync = useCallback(async (): Promise<void> => {
    await waitForAuthSessionSync();
  }, []);

  const signOut = useCallback(
    async (options?: { redirectTo?: string | null }): Promise<void> => {
      const { authService } = await import('@/shared/di/container');
      await authService.signOut();
      setUser(null);
      if (options?.redirectTo === null) return;
      router.push(options?.redirectTo ?? '/login');
    },
    [router]
  );

  return { user, isLoading, signIn, signUp, waitForSessionSync, signOut };
}
