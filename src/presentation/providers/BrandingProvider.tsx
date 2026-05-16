'use client';

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { env } from '@/infrastructure/config/env';
import { usesCoreOrganizationBranding } from '@/infrastructure/branding/organizationBrandingAuthority';
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
  const { session } = useSaaSProfile();
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

  const revokeBlobUrl = useCallback(() => {
    if (blobUrlRef.current != null) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
  }, []);

  const fetchBrandingMeta = useCallback(async () => {
    const token = accessTokenRef.current;
    try {
      const res = await fetch('/api/branding', {
        cache: 'no-store',
        headers: brandingAuthHeaders(token),
      });
      const data = res.ok ? await res.json() : {};
      setShopName(typeof data.shopName === 'string' ? data.shopName : defaultName);
      setHasLogo(Boolean(data.hasLogo));
    } catch {
      setShopName(defaultName);
      setHasLogo(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadLogo = async () => {
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
    await fetchBrandingMeta();
    setLogoVersion((v) => v + 1);
    setIsLoading(false);
  }, [fetchBrandingMeta]);

  useEffect(() => {
    if (!sessionUserId) {
      hasFetchedRef.current = false;
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
  }, [fetchBrandingMeta, sessionUserId]);

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
