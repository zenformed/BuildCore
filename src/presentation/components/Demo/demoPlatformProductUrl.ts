import { env } from '@/infrastructure/config/env';
import { buildcoreAppDefinition } from '@/platform/appDefinitions/buildcore';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';

export function buildDemoPlatformProductPageUrl(scrollToPricing = false): string {
  const platformOrigin = env.platformPublicAppUrl.replace(/\/+$/, '');
  const base = `${platformOrigin}/products/${encodeURIComponent(buildcoreAppDefinition.appSlug)}`;
  return scrollToPricing ? `${base}#${content.demo.banner.pricingSectionId}` : base;
}

export function navigateToDemoPlatformProductPage(scrollToPricing = false): void {
  window.location.assign(buildDemoPlatformProductPageUrl(scrollToPricing));
}
