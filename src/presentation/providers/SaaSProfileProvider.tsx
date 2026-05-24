'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { AuthChangeEvent, User } from '@supabase/supabase-js';
import type { SaaSEntitlementSnapshot } from '@/application/ports';
import { mapLegacyProfilesFieldsToSnapshot } from '@/application/entitlements/legacyProfilesEntitlementMapping';
import { getRuntimeEntitlementSourceMode } from '@/infrastructure/config/runtimeEntitlementSource';
import { runtimeModes } from '@/infrastructure/config/runtimeModes';
import { parseEntitlementSnapshotJson } from '@/infrastructure/coreApi/parseResponse';
import {
  resolveSaasProfileAuthReaction,
  shouldApplyAuthCallbackSession,
  shouldShowSaasProfileFullPageLoading,
} from '@zenformed/core';
import { BUILD_CORE_APP_SLUG } from '@/infrastructure/entitlements/buildCoreZenformedAppContext';
import {
  CORE_PLATFORM_HEALTH_POLL_MS,
  CORE_PLATFORM_REFETCH_COOLDOWN_MS,
} from '@/infrastructure/coreApi/corePlatformHealth';
import { createCooldownGate } from '@/infrastructure/coreApi/fetchWithCooldown';
import {
  isCoreRelaySuccess,
  isCoreRelayUnreachable,
  isCoreRelayUnconfigured,
  parseCoreRelayBody,
} from '@/infrastructure/coreApi/coreRelayStatus';
import { isZenformedCorePlatformRequired } from '@/infrastructure/coreApi/corePlatformRequirement';
import {
  clearCachedSaaSProfile,
  mapSupabaseProfilesRowToSaaSProfile,
  resolveProfileWhenCoreDegraded,
  saveCachedSaaSProfile,
} from '@/infrastructure/profile/saasProfileFallback';
import { getSupabaseClient, type Session } from '@/infrastructure/supabase/supabaseClient';
import { parseOrganizationMembershipContextJson } from '@/infrastructure/coreApi/parseResponse';

export type CorePlatformStatus = 'not_required' | 'loading' | 'available' | 'unavailable';

export type LicenseTier = 'STANDARD' | 'PRO';

export type OrganizationMembershipKind =
  | 'none'
  | 'organization_bootstrap_owner'
  | 'invited_member';

export type OrganizationMembershipContext = {
  hasActiveMembership: boolean;
  hasNonPersonalOrganizationMembership: boolean;
  membershipKind: OrganizationMembershipKind;
  role: 'owner' | 'admin' | 'coordinator' | 'member' | null;
};

export type MembershipContextStatus = 'pending' | 'ready' | 'failed';

export type SaaSProfile = {
  id: string;
  email: string | null;
  subscription_status: string;
  license_tier: LicenseTier;
  company_name: string | null;
  industry: string | null;
  force_password_reset: boolean;
  updated_at: string;
};

type CoreEntitlementResolutionState =
  | { status: 'unused' }
  | { status: 'pending' }
  | { status: 'from_core'; snapshot: SaaSEntitlementSnapshot }
  | { status: 'from_profile_fallback' }
  | { status: 'core_unreachable' }
  | { status: 'blocked_null' };

export type EntitlementResolutionStatus = CoreEntitlementResolutionState['status'];

type LoadProfileOptions = {
  readonly soft?: boolean;
  readonly force?: boolean;
  readonly generation?: number;
};

type AppAccessLoadResult = {
  readonly membershipContextStatus: MembershipContextStatus;
  readonly entitlementResolutionPending: boolean;
  readonly entitlementActive: boolean;
};

function resolveEntitlementSnapshot(
  profile: SaaSProfile | null,
  resolution: CoreEntitlementResolutionState,
  cachedCoreEntitlement: SaaSEntitlementSnapshot | null
): SaaSEntitlementSnapshot | null {
  if (!profile) return null;
  const coreRuntimeEnabled =
    getRuntimeEntitlementSourceMode() === 'core' &&
    runtimeModes.isSaasMode() &&
    !runtimeModes.useMockAuth();
  const legacy = mapLegacyProfilesFieldsToSnapshot({
    subscription_status: profile.subscription_status,
    license_tier: profile.license_tier,
  });
  if (!coreRuntimeEnabled) return legacy;
  switch (resolution.status) {
    case 'from_core':
      return resolution.snapshot;
    case 'blocked_null':
    case 'pending':
      return null;
    case 'from_profile_fallback':
    case 'core_unreachable':
    case 'unused':
    default:
      return cachedCoreEntitlement ?? legacy;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    globalThis.setTimeout(resolve, ms);
  });
}

async function fetchEntitlementSnapshotFromInternalRelay(
  accessToken: string
): Promise<Exclude<CoreEntitlementResolutionState, { status: 'unused' } | { status: 'pending' }>> {
  const slug = encodeURIComponent(BUILD_CORE_APP_SLUG);
  let res: Response;
  try {
    res = await globalThis.fetch(`/api/internal/apps/${slug}/entitlement`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    });
  } catch {
    return { status: 'core_unreachable' };
  }

  let body: Record<string, unknown>;
  try {
    body = (await res.json()) as Record<string, unknown>;
  } catch {
    return { status: 'from_profile_fallback' };
  }

  const relay = parseCoreRelayBody(body);

  if (res.status === 401 || res.status === 403) {
    return { status: 'blocked_null' };
  }

  if (isCoreRelayUnreachable(res, relay)) {
    return { status: 'core_unreachable' };
  }

  if (res.ok && isCoreRelaySuccess(relay)) {
    const snap = parseEntitlementSnapshotJson(body.entitlement);
    if (snap != null) return { status: 'from_core', snapshot: snap };
    return { status: 'from_profile_fallback' };
  }

  if (res.ok && isCoreRelayUnconfigured(relay)) {
    return { status: 'from_profile_fallback' };
  }

  if (res.status === 404) {
    const err = body.error;
    if (err === 'profile_not_found') {
      return { status: 'blocked_null' };
    }
    return { status: 'from_profile_fallback' };
  }

  return { status: 'from_profile_fallback' };
}

type SaaSProfileContextValue = {
  session: Session | null;
  user: User | null;
  profile: SaaSProfile | null;
  organizationMembershipContext: OrganizationMembershipContext | null;
  membershipContextStatus: MembershipContextStatus;
  entitlementSnapshot: SaaSEntitlementSnapshot | null;
  entitlementResolutionStatus: EntitlementResolutionStatus;
  corePlatformStatus: CorePlatformStatus;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  waitForAppAccessReady: () => Promise<{ ok: true } | { ok: false; reason: string }>;
};

const SaaSProfileContext = createContext<SaaSProfileContextValue | null>(null);

function hasUsableAccessToken(session: Session | null): session is Session & { access_token: string } {
  return typeof session?.access_token === 'string' && session.access_token.length > 0;
}

async function fetchProfileFromCoreRelay(accessToken: string): Promise<Response> {
  return globalThis.fetch('/api/internal/users-me-profile', {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

async function fetchMembershipContextFromRelay(
  accessToken: string
): Promise<OrganizationMembershipContext | null> {
  try {
    const res = await globalThis.fetch('/api/internal/organization/membership-context', {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    });
    let json: unknown;
    try {
      json = await res.json();
    } catch {
      return null;
    }
    if (!res.ok) return null;
    return parseOrganizationMembershipContextJson(json);
  } catch {
    return null;
  }
}

function shouldResolveMembershipContextForSaas(): boolean {
  return runtimeModes.isSaasMode() && !runtimeModes.useMockAuth();
}

export function SaaSProfileProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<SaaSProfile | null>(null);
  const [organizationMembershipContext, setOrganizationMembershipContext] =
    useState<OrganizationMembershipContext | null>(null);
  const [membershipContextStatus, setMembershipContextStatus] =
    useState<MembershipContextStatus>('pending');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [coreEntitlementResolution, setCoreEntitlementResolution] =
    useState<CoreEntitlementResolutionState>({ status: 'unused' });
  const [corePlatformStatus, setCorePlatformStatus] = useState<CorePlatformStatus>('not_required');

  const inFlightRef = useRef<Promise<void> | null>(null);
  const coreRefetchCooldownRef = useRef(createCooldownGate(CORE_PLATFORM_REFETCH_COOLDOWN_MS));
  const coreUnavailableRef = useRef(false);
  const cachedCoreEntitlementRef = useRef<SaaSEntitlementSnapshot | null>(null);
  const bootstrappedUserIdRef = useRef<string | null>(null);
  const profileRef = useRef<SaaSProfile | null>(null);
  const loadGenerationRef = useRef(0);
  const coreEntitlementResolutionRef = useRef<CoreEntitlementResolutionState>({ status: 'unused' });
  const membershipContextStatusRef = useRef<MembershipContextStatus>('pending');
  const lastAppAccessLoadRef = useRef<AppAccessLoadResult>({
    membershipContextStatus: 'pending',
    entitlementResolutionPending: true,
    entitlementActive: false,
  });
  profileRef.current = profile;
  coreEntitlementResolutionRef.current = coreEntitlementResolution;
  membershipContextStatusRef.current = membershipContextStatus;
  if (profile?.id) {
    bootstrappedUserIdRef.current = profile.id;
  }

  /**
   * `soft`: do not toggle `loading` (SaaSAuthGate full-screen shell).
   * `force`: bypass in-flight coalescing (explicit user/gate refetch).
   */
  const loadProfile = useCallback(async (options?: LoadProfileOptions) => {
    const soft = options?.soft ?? false;
    const force = options?.force ?? false;
    const generation =
      options?.generation ?? (force ? ++loadGenerationRef.current : loadGenerationRef.current);
    if (force && options?.generation == null) {
      cachedCoreEntitlementRef.current = null;
    }
    const isStale = (): boolean => force && generation !== loadGenerationRef.current;

    const run = async (): Promise<void> => {
      if (shouldShowSaasProfileFullPageLoading(soft, profileRef.current != null)) {
        setLoading(true);
      }
      setError(null);

      const coreRuntimeEnabled = isZenformedCorePlatformRequired();
      let activeSession: Session | null = null;

      try {
        if (!coreRuntimeEnabled) {
          setCorePlatformStatus('not_required');
        } else if (!soft) {
          setCorePlatformStatus('loading');
        }
        const supabase = getSupabaseClient();
        const {
          data: { session: s },
        } = await supabase.auth.getSession();
        if (isStale()) return;
        if (!s?.user) {
          if (soft && profileRef.current != null) {
            return;
          }
          setSession(s);
          setUser(null);
          setProfile(null);
          setOrganizationMembershipContext(null);
          setMembershipContextStatus('ready');
          bootstrappedUserIdRef.current = null;
          setCoreEntitlementResolution({ status: 'unused' });
          setCorePlatformStatus('not_required');
          return;
        }
        activeSession = s;
        setSession(s);
        setUser(s.user ?? null);
        if (shouldResolveMembershipContextForSaas()) {
          setOrganizationMembershipContext(null);
          setMembershipContextStatus('pending');
        }
        const bootSession = activeSession;

        if (
          coreRuntimeEnabled &&
          coreUnavailableRef.current &&
          profileRef.current != null &&
          !force &&
          !coreRefetchCooldownRef.current.canRun
        ) {
          setCorePlatformStatus('unavailable');
          setLoading(false);
          return;
        }

        if (coreRuntimeEnabled && !(soft && profileRef.current != null)) {
          setCoreEntitlementResolution({ status: 'pending' });
        } else if (!coreRuntimeEnabled) {
          setCoreEntitlementResolution({ status: 'unused' });
        }

        const tryZenformedCoreRelay =
          runtimeModes.isSaasMode() &&
          !runtimeModes.useMockAuth() &&
          hasUsableAccessToken(activeSession);

        const finalizeCoreEntitlement = async (token: string): Promise<void> => {
          if (!coreRuntimeEnabled || !token) return;
          if (coreUnavailableRef.current) {
            const next = { status: 'from_profile_fallback' } as const;
            coreEntitlementResolutionRef.current = next;
            if (!isStale()) setCoreEntitlementResolution(next);
            return;
          }
          const r = await fetchEntitlementSnapshotFromInternalRelay(token);
          if (isStale()) return;
          if (r.status === 'core_unreachable') {
            coreUnavailableRef.current = true;
            if (!isStale()) setCorePlatformStatus('unavailable');
            const next = { status: 'from_profile_fallback' } as const;
            coreEntitlementResolutionRef.current = next;
            if (!isStale()) setCoreEntitlementResolution(next);
            return;
          }
          if (r.status === 'from_core') {
            cachedCoreEntitlementRef.current = r.snapshot;
          }
          coreEntitlementResolutionRef.current = r;
          if (!isStale()) setCoreEntitlementResolution(r);
        };

        const syncMembershipContext = async (token: string | null | undefined): Promise<void> => {
          const canRelay =
            runtimeModes.isSaasMode() &&
            !runtimeModes.useMockAuth() &&
            typeof token === 'string' &&
            token.length > 0;
          if (!canRelay) {
            membershipContextStatusRef.current = 'ready';
            if (!isStale()) {
              setOrganizationMembershipContext(null);
              setMembershipContextStatus('ready');
            }
            return;
          }
          membershipContextStatusRef.current = 'pending';
          if (!isStale()) setMembershipContextStatus('pending');
          const ctx = await fetchMembershipContextFromRelay(token);
          if (isStale()) return;
          if (ctx == null) {
            membershipContextStatusRef.current = 'failed';
            if (!isStale()) {
              setOrganizationMembershipContext({
                hasActiveMembership: false,
                hasNonPersonalOrganizationMembership: false,
                membershipKind: 'none',
                role: null,
              });
              setMembershipContextStatus('failed');
            }
            return;
          }
          membershipContextStatusRef.current = 'ready';
          if (!isStale()) {
            setOrganizationMembershipContext(ctx);
            setMembershipContextStatus('ready');
          }
        };

        if (tryZenformedCoreRelay) {
          let coreRelayFailed = false;
          try {
            let relayRes = await fetchProfileFromCoreRelay(activeSession.access_token);

            if (relayRes.status === 401 || relayRes.status === 403) {
              const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
              if (!refreshError && hasUsableAccessToken(refreshed.session)) {
                activeSession = refreshed.session;
                setSession(refreshed.session);
                setUser(refreshed.session.user);
                relayRes = await fetchProfileFromCoreRelay(refreshed.session.access_token);
              } else {
                await supabase.auth.signOut();
                bootstrappedUserIdRef.current = null;
                setSession(null);
                setUser(null);
                setProfile(null);
                setOrganizationMembershipContext(null);
                setMembershipContextStatus('ready');
                setCoreEntitlementResolution({ status: 'unused' });
                setCorePlatformStatus('not_required');
                return;
              }
            }

            let relayBody: Record<string, unknown> = {};
            try {
              relayBody = (await relayRes.json()) as Record<string, unknown>;
            } catch {
              relayBody = {};
            }
            const parsedRelay = parseCoreRelayBody(relayBody);

            if (coreRuntimeEnabled && isCoreRelayUnreachable(relayRes, parsedRelay)) {
              coreRelayFailed = true;
              coreUnavailableRef.current = true;
              setCorePlatformStatus('unavailable');
            } else if (
              relayRes.ok &&
              isCoreRelaySuccess(parsedRelay) &&
              relayBody.profile != null &&
              typeof relayBody.profile === 'object'
            ) {
              coreUnavailableRef.current = false;
              setCorePlatformStatus('available');
              const coreProfile = relayBody.profile as SaaSProfile;
              saveCachedSaaSProfile(coreProfile);
              setProfile(coreProfile);
              bootstrappedUserIdRef.current = activeSession.user.id;
              setError(null);
              await finalizeCoreEntitlement(activeSession.access_token);
              if (isStale()) return;
              await syncMembershipContext(activeSession.access_token);
              if (isStale()) return;
              return;
            } else if (isCoreRelayUnconfigured(parsedRelay)) {
              setCorePlatformStatus('not_required');
            }
          } catch {
            if (coreRuntimeEnabled) {
              coreRelayFailed = true;
              coreUnavailableRef.current = true;
              setCorePlatformStatus('unavailable');
            }
          }

        }

        const { data: p, error: e } = await supabase
          .from('profiles')
          .select(
            'id, email, subscription_status, license_tier, company_name, industry, force_password_reset, updated_at'
          )
          .eq('id', bootSession.user.id)
          .maybeSingle();

        const applyResolvedProfile = async (resolved: SaaSProfile | null): Promise<void> => {
          setProfile(resolved);
          if (resolved) {
            bootstrappedUserIdRef.current = bootSession.user.id;
          } else {
            bootstrappedUserIdRef.current = null;
          }
          if (resolved && hasUsableAccessToken(bootSession)) {
            if (!coreUnavailableRef.current) {
              await finalizeCoreEntitlement(bootSession.access_token);
            } else {
              setCoreEntitlementResolution({ status: 'from_profile_fallback' });
            }
          } else {
            setCoreEntitlementResolution({ status: 'unused' });
          }
          if (!coreRuntimeEnabled) {
            setCorePlatformStatus('not_required');
          }
          await syncMembershipContext(
            resolved && hasUsableAccessToken(bootSession) ? bootSession.access_token : null
          );
          if (isStale()) return;
        };

        if (e) {
          if (!soft) {
            if (coreUnavailableRef.current && bootSession.user) {
              const resolved = resolveProfileWhenCoreDegraded(bootSession.user, null);
              await applyResolvedProfile(resolved);
              setError(null);
            } else {
              setError(e.message);
              setProfile(null);
              setCoreEntitlementResolution({ status: 'unused' });
            }
          }
        } else if (p) {
          const resolved = mapSupabaseProfilesRowToSaaSProfile(
            p as Record<string, unknown>,
            bootSession.user.id
          );
          saveCachedSaaSProfile(resolved);
          await applyResolvedProfile(resolved);
        } else if (coreUnavailableRef.current && bootSession.user) {
          const resolved = resolveProfileWhenCoreDegraded(bootSession.user, null);
          await applyResolvedProfile(resolved);
        } else {
          await applyResolvedProfile(null);
        }
      } catch (err) {
        if (!soft) {
          if (isZenformedCorePlatformRequired()) {
            setCorePlatformStatus('unavailable');
            coreUnavailableRef.current = true;
          }
          if (profileRef.current == null && activeSession?.user) {
            const resolved = resolveProfileWhenCoreDegraded(activeSession.user, null);
            setProfile(resolved);
            bootstrappedUserIdRef.current = activeSession.user.id;
            setCoreEntitlementResolution({ status: 'from_profile_fallback' });
            setError(null);
          } else if (profileRef.current == null) {
            setError(err instanceof Error ? err.message : 'Failed to load profile');
            setProfile(null);
            setCoreEntitlementResolution({ status: 'unused' });
          }
        }
      } finally {
        if (!isStale()) {
          const snap = resolveEntitlementSnapshot(
            profileRef.current,
            coreEntitlementResolutionRef.current,
            cachedCoreEntitlementRef.current
          );
          lastAppAccessLoadRef.current = {
            membershipContextStatus: membershipContextStatusRef.current,
            entitlementResolutionPending: coreEntitlementResolutionRef.current.status === 'pending',
            entitlementActive: snap?.subscriptionActive ?? false,
          };
          setLoading(false);
        }
      }
    };

    if (inFlightRef.current != null && !force) {
      return inFlightRef.current;
    }

    const p = run();
    inFlightRef.current = p;
    try {
      await p;
    } finally {
      if (inFlightRef.current === p) {
        inFlightRef.current = null;
      }
    }
  }, []);

  useEffect(() => {
    void loadProfile({ soft: false, force: true });
    const supabase = getSupabaseClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, newSession: Session | null) => {
      const reaction = resolveSaasProfileAuthReaction({
        event,
        userId: newSession?.user?.id ?? null,
        profileUserId: profileRef.current?.id ?? null,
        bootstrappedUserId: bootstrappedUserIdRef.current,
        hasProfile: profileRef.current != null,
      });

      const applySession = (): void => {
        if (!shouldApplyAuthCallbackSession(newSession)) return;
        setSession(newSession);
        setUser(newSession.user ?? null);
      };

      switch (reaction) {
        case 'token_only':
        case 'silent_session':
          applySession();
          return;
        case 'sign_out': {
          const signedOutUserId = profileRef.current?.id ?? bootstrappedUserIdRef.current;
          if (signedOutUserId) clearCachedSaaSProfile(signedOutUserId);
          bootstrappedUserIdRef.current = null;
          setSession(null);
          setUser(null);
          setProfile(null);
          setOrganizationMembershipContext(null);
          setMembershipContextStatus('pending');
          setCoreEntitlementResolution({ status: 'unused' });
          cachedCoreEntitlementRef.current = null;
          coreUnavailableRef.current = false;
          setCorePlatformStatus('not_required');
          setLoading(false);
          setError(null);
          return;
        }
        case 'load_full':
          if (shouldResolveMembershipContextForSaas() && newSession?.user) {
            setOrganizationMembershipContext(null);
            setMembershipContextStatus('pending');
          }
          void loadProfile({
            soft: profileRef.current != null,
            force: profileRef.current == null,
          });
          return;
        case 'load_soft':
          if (shouldResolveMembershipContextForSaas() && newSession?.user) {
            setOrganizationMembershipContext(null);
            setMembershipContextStatus('pending');
          }
          void loadProfile({ soft: true, force: false });
          return;
        default:
          return;
      }
    });
    return () => subscription.unsubscribe();
  }, [loadProfile]);

  const entitlementSnapshot = useMemo(
    (): SaaSEntitlementSnapshot | null =>
      resolveEntitlementSnapshot(profile, coreEntitlementResolution, cachedCoreEntitlementRef.current),
    [profile, coreEntitlementResolution]
  );

  const waitForAppAccessReady = useCallback(async (): Promise<
    { ok: true } | { ok: false; reason: string }
  > => {
    const generation = ++loadGenerationRef.current;
    cachedCoreEntitlementRef.current = null;
    coreEntitlementResolutionRef.current = { status: 'pending' };
    setCoreEntitlementResolution({ status: 'pending' });

    const supabase = getSupabaseClient();
    const {
      data: { session: s },
    } = await supabase.auth.getSession();
    const token = s?.access_token?.trim();
    if (!token) {
      return { ok: false, reason: 'Session is not ready. Try signing in again.' };
    }

    for (let attempt = 0; attempt < 15; attempt += 1) {
      if (generation !== loadGenerationRef.current) {
        return { ok: false, reason: 'App access refresh was superseded.' };
      }

      const ent = await fetchEntitlementSnapshotFromInternalRelay(token);
      const mem = await fetchMembershipContextFromRelay(token);
      const entitlementActive = ent.status === 'from_core' && ent.snapshot.subscriptionActive;

      if (entitlementActive && mem != null) {
        if (ent.status === 'from_core') {
          cachedCoreEntitlementRef.current = ent.snapshot;
        }
        coreEntitlementResolutionRef.current = ent;
        membershipContextStatusRef.current = 'ready';
        setCoreEntitlementResolution(ent);
        setOrganizationMembershipContext(mem);
        setMembershipContextStatus('ready');
        await loadProfile({ soft: false, force: true, generation });
        return { ok: true };
      }

      if (attempt < 14) {
        await sleep(250);
      }
    }

    await loadProfile({ soft: false, force: true, generation });
    const finalEnt = await fetchEntitlementSnapshotFromInternalRelay(token);
    if (finalEnt.status === 'from_core' && finalEnt.snapshot.subscriptionActive) {
      cachedCoreEntitlementRef.current = finalEnt.snapshot;
      coreEntitlementResolutionRef.current = finalEnt;
      setCoreEntitlementResolution(finalEnt);
      return { ok: true };
    }

    return {
      ok: false,
      reason:
        'Your invite was accepted, but app access is still syncing. Try signing in again in a moment.',
    };
  }, [loadProfile]);

  const refetchWithCooldown = useCallback(async () => {
    if (coreUnavailableRef.current && !coreRefetchCooldownRef.current.canRun) {
      return;
    }
    if (coreUnavailableRef.current) {
      coreRefetchCooldownRef.current.markRan();
    }
    await loadProfile({ soft: true, force: true });
  }, [loadProfile]);

  useEffect(() => {
    if (corePlatformStatus !== 'unavailable') return;
    const intervalId = globalThis.setInterval(() => {
      void refetchWithCooldown();
    }, CORE_PLATFORM_HEALTH_POLL_MS);
    return () => globalThis.clearInterval(intervalId);
  }, [corePlatformStatus, refetchWithCooldown]);

  const value = useMemo<SaaSProfileContextValue>(
    () => ({
      session,
      user,
      profile,
      organizationMembershipContext,
      membershipContextStatus,
      entitlementSnapshot,
      entitlementResolutionStatus: coreEntitlementResolution.status,
      corePlatformStatus,
      loading,
      error,
      refetch: refetchWithCooldown,
      waitForAppAccessReady,
    }),
    [
      session,
      user,
      profile,
      organizationMembershipContext,
      membershipContextStatus,
      entitlementSnapshot,
      coreEntitlementResolution.status,
      corePlatformStatus,
      loading,
      error,
      refetchWithCooldown,
      waitForAppAccessReady,
    ]
  );

  return <SaaSProfileContext.Provider value={value}>{children}</SaaSProfileContext.Provider>;
}

export function useSaaSProfile(): SaaSProfileContextValue {
  const ctx = useContext(SaaSProfileContext);
  if (ctx == null) {
    throw new Error('useSaaSProfile must be used within SaaSProfileProvider');
  }
  return ctx;
}
