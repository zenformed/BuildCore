import type { SupabaseClient } from '@supabase/supabase-js';
import type { CrmProjectDetail } from '@/domain/crm';
import {
  getCrmProjectChildDetailBySlugsForOrg,
  getCrmProjectDetailBySlugForOrg,
} from './crmReadService';

export type CrmProjectOrgRouteScope = {
  readonly parentSlug?: string | null;
};

/** Resolve a parent or nested subproject detail for CRM API routes. */
export async function resolveCrmProjectDetailForOrgRoute(
  supabase: SupabaseClient,
  organizationId: string,
  slug: string,
  scope?: CrmProjectOrgRouteScope
): Promise<CrmProjectDetail | null> {
  const trimmedSlug = slug.trim();
  const parentSlug = scope?.parentSlug?.trim();
  if (!trimmedSlug) return null;

  if (parentSlug) {
    return getCrmProjectChildDetailBySlugsForOrg(
      supabase,
      organizationId,
      parentSlug,
      trimmedSlug
    );
  }

  return getCrmProjectDetailBySlugForOrg(supabase, organizationId, trimmedSlug);
}
