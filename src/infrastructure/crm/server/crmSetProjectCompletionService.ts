import type { SupabaseClient } from '@supabase/supabase-js';
import type { CrmProjectDetail } from '@/domain/crm';
import { getCrmProjectDetailBySlugForOrg } from './crmReadService';
import { setCrmProjectsStatusForOrg } from './crmSetProjectsStatusService';

export class CrmProjectCompletionConfirmationRequiredError extends Error {
  readonly incompleteTaskCount: number;
  readonly incompleteStages: readonly { readonly stageSlug: string; readonly stageLabel: string }[];

  constructor(
    message: string,
    incompleteTaskCount: number,
    incompleteStages: readonly { readonly stageSlug: string; readonly stageLabel: string }[] = []
  ) {
    super(message);
    this.name = 'CrmProjectCompletionConfirmationRequiredError';
    this.incompleteTaskCount = incompleteTaskCount;
    this.incompleteStages = incompleteStages;
  }
}

/** @deprecated Use CrmProjectCompletionConfirmationRequiredError */
export class CrmProjectCompletionBlockedError extends CrmProjectCompletionConfirmationRequiredError {
  constructor(message = 'Confirmation required to mark this project complete with incomplete tasks.') {
    super(message, 0, []);
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
 * Incomplete tasks require confirmIncompleteTasks=true (server-authoritative warning).
 */
export async function setCrmProjectCompletionBySlugForOrg(
  supabase: SupabaseClient,
  organizationId: string,
  actorUserId: string,
  slug: string,
  complete: boolean,
  options?: { readonly confirmIncompleteTasks?: boolean }
): Promise<CrmProjectDetail | null> {
  const result = await setCrmProjectsStatusForOrg(supabase, organizationId, actorUserId, {
    projectSlugs: [slug],
    status: complete ? 'completed' : 'active',
    lossReason: null,
    lossReasonOther: null,
    source: 'legacy_adapter',
    confirmIncompleteTasks: options?.confirmIncompleteTasks === true ? true : null,
  });

  const item = result.results[0];
  if (item == null || item.failureCode === 'not_found') {
    return null;
  }
  if (item.failureCode === 'unauthorized') {
    throw new CrmProjectCompletionForbiddenError(item.message ?? undefined);
  }
  if (item.failureCode === 'confirmation_required' || item.failureCode === 'completion_blocked') {
    throw new CrmProjectCompletionConfirmationRequiredError(
      item.message ?? 'Confirmation required to mark this project complete with incomplete tasks.',
      item.incompleteTaskCount ?? 0,
      item.incompleteStages ?? []
    );
  }
  if (item.failureCode === 'update_failed') {
    throw new Error(item.message ?? 'Failed to update project completion');
  }
  // already_at_status and success both return current detail
  return getCrmProjectDetailBySlugForOrg(supabase, organizationId, slug);
}
