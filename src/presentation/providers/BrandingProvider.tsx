'use client';

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { env } from '@/infrastructure/config/env';
import { usesCoreOrganizationBranding } from '@/infrastructure/branding/organizationBrandingAuthority';
import { CORE_PLATFORM_REFETCH_COOLDOWN_MS } from '@/infrastructure/coreApi/corePlatformHealth';
import { createCooldownGate } from '@/infrastructure/coreApi/fetchWithCooldown';
import { invalidateSessionCache, runSessionCached } from '@/infrastructure/coreApi/clientRequestDedupe';
import {
  isCoreRelayUnreachable,
  parseCoreRelayBody,
} from '@/infrastructure/coreApi/coreRelayStatus';
import { buildcoreAppDefinition } from '@/platform/appDefinitions/buildcore';
import { useSaaSProfile } from '@/presentation/hooks/useSaaSProfile';
import { deferNonCriticalWork } from '@/presentation/utils/deferNonCriticalWork';
import {
  brandingLogoCacheKey,
  loadSessionBlob,
  peekSessionBlobUrl,
} from '@/presentation/utils/sessionBlobCache';

const defaultName = buildcoreAppDefinition.displayName;

export interface BrandingState {
  shopName: string;
  logoUrl: string | null;
  hasLogo: boolean;
  isLoading: boolean;
  refetch: () => Promise<void>;
}

const BrandingContext = createContext<BrandingState>({
  shopName: defaultName,
  logoUrl: null,
  hasLogo: false,
  isLoading: false,
  refetch: async () => {},
});

function brandingAuthHeaders(accessToken: string | null): HeadersInit {
  return accessToken != null ? { Authorization: `Bearer ${accessToken}` } : {};
}

export function BrandingProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const { session, corePlatformStatus } = useSaaSProfile();
  const accessToken = env.isSaasMode ? session?.access_token ?? null : null;
  const sessionUserId = session?.user?.id ?? null;
  const accessTokenRef = useRef<string | null>(null);
  accessTokenRef.current = accessToken;
  const coreBranding = usesCoreOrganizationBranding();

  const [shopName, setShopName] = useState<string>(defaultName);
  const [hasLogo, setHasLogo] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [logoVersion, setLogoVersion] = useState(0);
  const hasFetchedRef = useRef(false);
  const coreUnreachableRef = useRef(false);
  const refetchCooldownRef = useRef(createCooldownGate(CORE_PLATFORM_REFETCH_COOLDOWN_MS));
  const cachedBrandingRef = useRef<{ shopName: string; hasLogo: boolean } | null>(null);

  const applyCachedBranding = useCallback(() => {
    if (cachedBrandingRef.current != null) {
      setShopName(cachedBrandingRef.current.shopName);
      setHasLogo(cachedBrandingRef.current.hasLogo);
      return;
    }
    setShopName(defaultName);
    setHasLogo(false);
  }, []);

  const fetchBrandingMeta = useCallback(async (options?: { force?: boolean }) => {
    if (coreUnreachableRef.current) {
      if (!options?.force || !refetchCooldownRef.current.canRun) {
        applyCachedBranding();
        return;
      }
      refetchCooldownRef.current.markRan();
    }

    const token = accessTokenRef.current;
    const cacheKey = `branding:meta:${sessionUserId ?? 'anonymous'}`;
    if (options?.force) {
      invalidateSessionCache(cacheKey);
    }
    try {
      await runSessionCached(cacheKey, async () => {
        const res = await fetch('/api/branding', {
          cache: 'no-store',
          headers: brandingAuthHeaders(token),
        });
        let body: Record<string, unknown> = {};
        try {
          body = (await res.json()) as Record<string, unknown>;
        } catch {
          body = {};
        }
        const relay = parseCoreRelayBody(body);
        if (isCoreRelayUnreachable(res, relay)) {
          coreUnreachableRef.current = true;
          applyCachedBranding();
          return null;
        }
        coreUnreachableRef.current = false;
        const data = res.ok ? body : {};
        const nextShopName = typeof data.shopName === 'string' ? data.shopName : defaultName;
        const nextHasLogo = Boolean(data.hasLogo);
        cachedBrandingRef.current = { shopName: nextShopName, hasLogo: nextHasLogo };
        setShopName(nextShopName);
        setHasLogo(nextHasLogo);
        return { shopName: nextShopName, hasLogo: nextHasLogo };
      });
    } catch {
      applyCachedBranding();
    }
  }, [applyCachedBranding, sessionUserId]);

  useEffect(() => {
    if (coreUnreachableRef.current || !hasLogo) {
      setLogoUrl(null);
      return;
    }
    if (coreBranding && accessTokenRef.current == null) {
      setLogoUrl(null);
      return;
    }

    const cacheKey = brandingLogoCacheKey(sessionUserId, logoVersion);
    const cached = peekSessionBlobUrl(cacheKey);
    if (cached !== undefined) {
      setLogoUrl(cached);
      return;
    }

    let cancelled = false;
    const cancelDefer = deferNonCriticalWork(() => {
      const token = accessTokenRef.current;
      void loadSessionBlob(cacheKey, async () => {
        const res = await fetch(`/api/branding/logo?t=${logoVersion}`, {
          cache: 'no-store',
          headers: brandingAuthHeaders(token),
        });
        if (!res.ok) return null;
        return res.blob();
      }).then((url) => {
        if (!cancelled) setLogoUrl(url);
      });
    });

    return () => {
      cancelled = true;
      cancelDefer();
    };
  }, [coreBranding, hasLogo, logoVersion, sessionUserId]);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    await fetchBrandingMeta({ force: true });
    setLogoVersion((v) => v + 1);
    setIsLoading(false);
  }, [fetchBrandingMeta]);

  useEffect(() => {
    if (corePlatformStatus === 'available') {
      coreUnreachableRef.current = false;
    }
  }, [corePlatformStatus]);

  useEffect(() => {
    if (!sessionUserId) {
      hasFetchedRef.current = false;
      coreUnreachableRef.current = false;
      cachedBrandingRef.current = null;
      return;
    }
    if (coreUnreachableRef.current && !refetchCooldownRef.current.canRun) {
      applyCachedBranding();
      return;
    }
    return deferNonCriticalWork(() => {
      void fetchBrandingMeta().finally(() => {
        hasFetchedRef.current = true;
      });
    });
  }, [applyCachedBranding, fetchBrandingMeta, sessionUserId, corePlatformStatus]);

  const value: BrandingState = {
    shopName,
    logoUrl,
    hasLogo,
    isLoading,
    refetch,
  };

  return <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>;
}

export function useBrandingContext(): BrandingState {
  return useContext(BrandingContext);
}
