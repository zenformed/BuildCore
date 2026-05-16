import type { ZenformedCoreOrganizationBranding } from '@/infrastructure/coreApi/types';

/** Wire shape returned by BuildCore `/api/branding` (shopName = Core displayName). */
export type AppBrandingApiDto = {
  shopName: string;
  hasLogo: boolean;
  organizationId?: string;
};

export function mapCoreBrandingToAppApi(branding: ZenformedCoreOrganizationBranding): AppBrandingApiDto {
  return {
    shopName: branding.displayName,
    hasLogo: branding.hasLogo,
    organizationId: branding.organizationId,
  };
}
