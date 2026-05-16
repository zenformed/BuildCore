'use client';

import React, { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { remediateStaleSaasSession } from '@/infrastructure/auth/remediateStaleSaasSession';
import { useSaaSProfile } from '@/presentation/hooks/useSaaSProfile';
import { useShadowCapabilitySnapshot } from '@/presentation/hooks/useShadowCapabilitySnapshot';
import { getSaaSAuthGateDecision } from './saasAuthGateDecision';
import { LicenseRequiredScreen } from './LicenseRequiredScreen';
import { UpdatePasswordScreen } from './UpdatePasswordScreen';
import { WelcomeOnboardingScreen } from './WelcomeOnboardingScreen';

const PUBLIC_PATHS = ['/login', '/register', '/forgot-password', '/reset-password'];

const LoadingShell = () => (
  <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <p>Loading…</p>
  </div>
);

export interface SaaSAuthGateProps {
  children: React.ReactNode;
}

/**
 * Flow: 1) Login screen (/login) first. 2) If force_password_reset → Update password.
 * 3) If no company_name → "Let's learn more about your company". 4) If not active → License required. 5) App.
 * Session with no profile = invalid/stale; sign out and send to login so cold start shows login screen.
 * On protected path with no session we refetch once so we pick up session right after sign-in (avoids redirect then flash back).
 */
export function SaaSAuthGate({ children }: SaaSAuthGateProps): React.ReactElement {
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { session, user, profile, entitlementSnapshot, loading, error, refetch } = useSaaSProfile();
  const refetchedForProtectedRef = useRef(false);
  const decision = getSaaSAuthGateDecision(session, user, profile, entitlementSnapshot);

  useShadowCapabilitySnapshot({
    session,
    userId: user?.id ?? null,
    entitlementSnapshot,
    profileReady: !loading && !error && profile != null,
  });

  const isPublicPath = PUBLIC_PATHS.some((p) => pathname?.startsWith(p));

  useEffect(() => {
    setMounted(true);
  }, []);

  // After sign-in we push /dashboard but gate state is still stale (no session). Refetch once so we get the new session instead of redirecting to login.
  useEffect(() => {
    if (!mounted || isPublicPath || session || profile) {
      if (session) refetchedForProtectedRef.current = false;
      return;
    }
    if (refetchedForProtectedRef.current) return;
    refetchedForProtectedRef.current = true;
    refetch();
  }, [mounted, isPublicPath, session, profile, refetch]);

  useEffect(() => {
    if (!mounted || loading || error) return;
    if (!session || !user) {
      if (!isPublicPath) router.replace('/login');
      return;
    }
    if (isPublicPath && pathname?.startsWith('/login')) {
      router.replace('/dashboard');
    }
  }, [mounted, loading, error, session, user, isPublicPath, pathname, router]);

  // Session but no profile (e.g. stale session or missing profiles row) → treat as not really logged in, send to login
  useEffect(() => {
    if (!mounted || loading || error || !session || !user || profile) return;
    // Keep gate focused on routing decisions; stale-session side effects live in auth helper.
    remediateStaleSaasSession().finally(() => {
      router.replace('/login');
    });
  }, [mounted, loading, error, session, user, profile, router]);

  if (!mounted) {
    return <LoadingShell />;
  }

  if (loading && !profile) {
    return <LoadingShell />;
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
        <p style={{ color: 'var(--color-danger, #dc2626)' }}>{error}</p>
      </div>
    );
  }

  if (decision === 'unauthenticated') {
    if (!isPublicPath) {
      if (profile) return <>{children}</>;
      return <LoadingShell />;
    }
    return <>{children}</>;
  }

  if (decision === 'loadingProfile' && !profile) {
    return <LoadingShell />;
  }

  if (decision === 'passwordResetRequired') {
    return <UpdatePasswordScreen onSuccess={refetch} />;
  }

  if (decision === 'onboardingRequired') {
    return <WelcomeOnboardingScreen onSuccess={refetch} />;
  }

  if (decision === 'licenseRequired') {
    return <LicenseRequiredScreen onRefetch={refetch} onSignOut={refetch} />;
  }

  return <>{children}</>;
}
