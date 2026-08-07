import type { SupabaseClient } from '@supabase/supabase-js';
import type { CrmProjectDetail } from '@/domain/crm';
import { getCrmProjectDetailBySlugForOrg } from './crmReadService';
import { setCrmProjectsStatusForOrg } from './crmSetProjectsStatusService';

export class CrmProjectCompletionBlockedError extends Error {
  constructor(message = 'All workflow tasks must be done before marking this project complete') {
    super(message);
    this.name = 'CrmProjectCompletionBlockedError';
  }
}

export class CrmProjectCompletionForbiddenError extends Error {
  constructor(message = 'You do not have permission to change status for this project.') {
    super(message);
    this.name = 'CrmProjectCompletionForbiddenError';
  }
}

/**
 * Thin adapter: completion → unified status service.
 * complete true → completed; complete false → active (per Phase 2 product mapping).
 */
export async function setCrmProjectCompletionBySlugForOrg(
  supabase: SupabaseClient,
  organizationId: string,
  actorUserId: string,
  slug: string,
  complete: boolean
): Promise<CrmProjectDetail | null> {
  const result = await setCrmProjectsStatusForOrg(supabase, organizationId, actorUserId, {
    projectSlugs: [slug],
    status: complete ? 'completed' : 'active',
    lossReason: null,
    lossReasonOther: null,
    source: 'legacy_adapter',
  });

  const item = result.results[0];
  if (item == null || item.failureCode === 'not_found') {
    return null;
  }
  if (item.failureCode === 'unauthorized') {
    throw new CrmProjectCompletionForbiddenError(item.message ?? undefined);
  }
  if (item.failureCode === 'completion_blocked') {
    throw new CrmProjectCompletionBlockedError(item.message ?? undefined);
  }
  if (item.failureCode === 'update_failed') {
    throw new Error(item.message ?? 'Failed to update project completion');
  }
  // already_at_status and success both return current detail
  return getCrmProjectDetailBySlugForOrg(supabase, organizationId, slug);
}
