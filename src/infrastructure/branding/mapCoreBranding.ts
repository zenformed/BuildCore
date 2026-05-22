import type { ZenformedCoreOrganizationBranding } from '@/infrastructure/coreApi/types';

/** Wire shape returned by BuildCore `/api/branding` (shopName = Core displayName). */
export type AppBrandingApiDto = {
  shopName: string;
  hasLogo: boolean;
  industry: string | null;
  timezone: string | null;
  organizationId?: string;
};

export function mapCoreBrandingToAppApi(branding: ZenformedCoreOrganizationBranding): AppBrandingApiDto {
  return {
    shopName: branding.displayName,
    hasLogo: branding.hasLogo,
    industry: branding.industry,
    timezone: branding.timezone,
    organizationId: branding.organizationId,
  };
}
