/**
 * Resolve an accessible root parent Project by slug for Subprojects list v2.
 * Returns null for missing/non-root/inaccessible parents (callers map to 404).
 */

import type { CrmProjectSummary } from '@/domain/crm';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getCrmProjectSummaryBySlugForOrg } from '../crmReadService';
import { memberCanAccessProjectIdForViewer } from '../crmMemberProjectVisibilityService';

export async function resolveAccessibleRootParentBySlugForChildrenListV2(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
  parentSlug: string
): Promise<CrmProjectSummary | null> {
  const slug = parentSlug.trim();
  if (!slug) return null;

  const parent = await getCrmProjectSummaryBySlugForOrg(supabase, organizationId, slug);
  if (parent == null) return null;
  if (parent.parentProjectId != null) return null;

  const canAccess = await memberCanAccessProjectIdForViewer(
    supabase,
    organizationId,
    userId,
    parent.id
  );
  if (!canAccess) return null;

  return parent;
}
