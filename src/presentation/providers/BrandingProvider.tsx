'use client';

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { env } from '@/infrastructure/config/env';
import { usesCoreOrganizationBranding } from '@/infrastructure/branding/organizationBrandingAuthority';
import { CORE_PLATFORM_REFETCH_COOLDOWN_MS } from '@/infrastructure/coreApi/corePlatformHealth';
import { createCooldownGate } from '@/infrastructure/coreApi/fetchWithCooldown';
import {
  isCoreRelayUnreachable,
  parseCoreRelayBody,
} from '@/infrastructure/coreApi/coreRelayStatus';
import { buildcoreAppDefinition } from '@/platform/appDefinitions/buildcore';
import { useSaaSProfile } from '@/presentation/hooks/useSaaSProfile';

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
  isLoading: true,
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
  const [isLoading, setIsLoading] = useState(true);
  const [logoVersion, setLogoVersion] = useState(0);
  const blobUrlRef = useRef<string | null>(null);
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

  const revokeBlobUrl = useCallback(() => {
    if (blobUrlRef.current != null) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
  }, []);

  const fetchBrandingMeta = useCallback(async (options?: { force?: boolean }) => {
    if (coreUnreachableRef.current) {
      if (!options?.force || !refetchCooldownRef.current.canRun) {
        applyCachedBranding();
        setIsLoading(false);
        return;
      }
      refetchCooldownRef.current.markRan();
    }

    const token = accessTokenRef.current;
    try {
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
        return;
      }
      coreUnreachableRef.current = false;
      const data = res.ok ? body : {};
      const nextShopName = typeof data.shopName === 'string' ? data.shopName : defaultName;
      const nextHasLogo = Boolean(data.hasLogo);
      cachedBrandingRef.current = { shopName: nextShopName, hasLogo: nextHasLogo };
      setShopName(nextShopName);
      setHasLogo(nextHasLogo);
    } catch {
      applyCachedBranding();
    }
  }, [applyCachedBranding]);

  useEffect(() => {
    let cancelled = false;

    const loadLogo = async () => {
      if (coreUnreachableRef.current) {
        return;
      }
      const token = accessTokenRef.current;
      if (!hasLogo) {
        revokeBlobUrl();
        setLogoUrl(null);
        return;
      }
      if (coreBranding && token == null) {
        revokeBlobUrl();
        setLogoUrl(null);
        return;
      }
      try {
        const res = await fetch(`/api/branding/logo?t=${logoVersion}`, {
          cache: 'no-store',
          headers: brandingAuthHeaders(token),
        });
        if (cancelled) return;
        if (!res.ok) {
          revokeBlobUrl();
          setLogoUrl(null);
          return;
        }
        const blob = await res.blob();
        if (cancelled) return;
        revokeBlobUrl();
        const url = URL.createObjectURL(blob);
        blobUrlRef.current = url;
        setLogoUrl(url);
      } catch {
        if (!cancelled) {
          revokeBlobUrl();
          setLogoUrl(null);
        }
      }
    };

    void loadLogo();
    return () => {
      cancelled = true;
    };
  }, [hasLogo, logoVersion, sessionUserId, coreBranding, revokeBlobUrl]);

  useEffect(() => {
    return () => {
      revokeBlobUrl();
    };
  }, [revokeBlobUrl]);

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
      setIsLoading(false);
      return;
    }
    if (coreUnreachableRef.current && !refetchCooldownRef.current.canRun) {
      applyCachedBranding();
      setIsLoading(false);
      return;
    }
    if (!hasFetchedRef.current) {
      setIsLoading(true);
    }
    void fetchBrandingMeta().finally(() => {
      hasFetchedRef.current = true;
      setIsLoading(false);
    });
  }, [fetchBrandingMeta, sessionUserId, corePlatformStatus, applyCachedBranding]);

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
