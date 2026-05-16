import { buildcoreAppDefinition } from '@/platform/appDefinitions/buildcore';

/** Stable slug for entitlement relay and shadow diagnostics — from app manifest. */
export const BUILD_CORE_APP_SLUG = buildcoreAppDefinition.appSlug;

export type BuildCoreEntitlementReadInput = {
  userId: string;
  accessToken?: string | null;
};

export function withBuildCoreSlug(input: BuildCoreEntitlementReadInput): {
  userId: string;
  appSlug: string;
  accessToken?: string | null;
} {
  return { userId: input.userId, appSlug: BUILD_CORE_APP_SLUG, accessToken: input.accessToken };
}
