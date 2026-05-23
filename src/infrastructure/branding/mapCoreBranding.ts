import type { ZenformedCoreOrganizationBranding } from '@/infrastructure/coreApi/types';

/** Wire shape returned by BuildCore `/api/branding` (`shopName` = public display label). */
export type AppBrandingApiDto = {
  legalName: string;
  displayName: string | null;
  publicDisplayName: string;
  shopName: string;
  hasLogo: boolean;
  canEditOrganizationProfile: boolean;
  industry: string | null;
  timezone: string | null;
  organizationId?: string;
};

export function mapCoreBrandingToAppApi(branding: ZenformedCoreOrganizationBranding): AppBrandingApiDto {
  return {
    legalName: branding.legalName,
    displayName: branding.displayName,
    publicDisplayName: branding.publicDisplayName,
    shopName: branding.publicDisplayName,
    hasLogo: branding.hasLogo,
    canEditOrganizationProfile: branding.canEditOrganizationProfile,
    industry: branding.industry,
    timezone: branding.timezone,
    organizationId: branding.organizationId,
  };
}
