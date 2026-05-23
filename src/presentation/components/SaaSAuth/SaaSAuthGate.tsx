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

const PUBLIC_PATHS = ['/login', '/register', '/forgot-password', '/reset-password', '/accept-invite'];

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
 * 3) If no company_name → onboarding. 4) If not active → License required. 5) App.
 * Core outage uses degraded mode (banner); entry requires Supabase session + resolved profile only.
 */
export function SaaSAuthGate({ children }: SaaSAuthGateProps): React.ReactElement {
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const {
    session,
    user,
    profile,
    entitlementSnapshot,
    corePlatformStatus,
    loading,
    error,
    refetch,
  } = useSaaSProfile();
  const refetchedForProtectedRef = useRef(false);
  const decision = getSaaSAuthGateDecision(
    session,
    user,
    profile,
    entitlementSnapshot,
    corePlatformStatus,
    loading
  );

  useShadowCapabilitySnapshot({
    session,
    userId: user?.id ?? null,
    entitlementSnapshot,
    profileReady: !loading && !error && profile != null,
  });

  const isPublicPath = PUBLIC_PATHS.some((p) => pathname?.startsWith(p));
  const isAcceptInvitePath = pathname?.startsWith('/accept-invite');

  useEffect(() => {
    setMounted(true);
  }, []);

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

  useEffect(() => {
    if (!mounted || loading || error || !session || !user || profile) return;
    if (corePlatformStatus === 'unavailable') return;
    remediateStaleSaasSession().finally(() => {
      router.replace('/login');
    });
  }, [mounted, loading, error, session, user, profile, corePlatformStatus, router]);

  if (!mounted) {
    return <LoadingShell />;
  }

  if (loading && !profile) {
    return <LoadingShell />;
  }

  if (error && !profile) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
        }}
      >
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

  if (isAcceptInvitePath && session && user) {
    return <>{children}</>;
  }

  if (decision === 'onboardingRequired') {
    return <WelcomeOnboardingScreen onSuccess={refetch} />;
  }

  if (decision === 'licenseRequired') {
    return <LicenseRequiredScreen onRefetch={refetch} onSignOut={refetch} />;
  }

  return <>{children}</>;
}
