'use client';

import { useCallback } from 'react';
import type { SignInResult } from '@/application/ports/IAuthService';
import { useAuth } from './useAuth';

export interface AuthInterface {
  signIn: (email: string, password: string) => Promise<SignInResult>;
  signOut: () => Promise<void>;
}

/**
 * Minimal auth UI boundary.
 * Keeps UI components on a single interface for sign-in/sign-out without changing existing adapter behavior.
 */
export function useAuthInterface(): AuthInterface {
  const { signIn, signOut } = useAuth();

  const wrappedSignIn = useCallback(
    async (email: string, password: string): Promise<SignInResult> => signIn(email, password),
    [signIn]
  );

  const wrappedSignOut = useCallback(async (): Promise<void> => {
    await signOut();
  }, [signOut]);

  return {
    signIn: wrappedSignIn,
    signOut: wrappedSignOut,
  };
}

