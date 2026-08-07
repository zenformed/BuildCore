import type { SupabaseClient } from '@supabase/supabase-js';
import type { BulkMarkInactiveCrmProjectsResult } from '@/domain/crm/bulkMarkInactiveProjects';
import {
  isCrmInactiveReason,
  isCrmLossReason,
  validateMarkCrmProjectsInactiveInput,
  type CrmInactiveReason,
  type CrmLossReason,
  type MarkCrmProjectsInactiveInput,
} from '@/domain/crm/projectStatus';
import { setCrmProjectsStatusForOrg } from './crmSetProjectsStatusService';

export class CrmMarkProjectsInactiveValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CrmMarkProjectsInactiveValidationError';
  }
}

function legacyInactiveReasonToStatusInput(reason: CrmInactiveReason, customReason: string | null): {
  readonly status: 'lost' | 'cancelled';
  readonly lossReason: CrmLossReason | null;
  readonly lossReasonOther: string | null;
} {
  if (reason === 'project_canceled') {
    return { status: 'cancelled', lossReason: null, lossReasonOther: null };
  }
  const lossReason: CrmLossReason = isCrmLossReason(reason) ? reason : 'other';
  return {
    status: 'lost',
    lossReason,
    lossReasonOther: lossReason === 'other' ? customReason : null,
  };
}

/** Thin adapter: mark-inactive → unified status service (lost or cancelled). */
export async function markCrmProjectsInactiveForOrg(
  supabase: SupabaseClient,
  organizationId: string,
  actorUserId: string,
  input: MarkCrmProjectsInactiveInput
): Promise<BulkMarkInactiveCrmProjectsResult> {
  const validationError = validateMarkCrmProjectsInactiveInput(input);
  if (validationError != null) {
    throw new CrmMarkProjectsInactiveValidationError(validationError);
  }

  const reason = input.reason as CrmInactiveReason;
  const customReason = reason === 'other' ? input.customReason?.trim() ?? null : null;
  const mapped = legacyInactiveReasonToStatusInput(reason, customReason);

  const result = await setCrmProjectsStatusForOrg(supabase, organizationId, actorUserId, {
    projectSlugs: input.projectSlugs,
    status: mapped.status,
    lossReason: mapped.lossReason,
    lossReasonOther: mapped.lossReasonOther,
    source: 'legacy_adapter',
  });

  const updatedSlugs = result.results.filter((item) => item.success).map((item) => item.slug);
  const failedSlugs = [
    ...new Set(result.results.filter((item) => !item.success).map((item) => item.slug)),
  ];

  return {
    updatedCount: result.updatedCount,
    updatedSlugs,
    failedSlugs,
  };
}

export function parseMarkCrmProjectsInactiveBody(body: unknown): MarkCrmProjectsInactiveInput | null {
  if (body == null || typeof body !== 'object') return null;

  const record = body as Record<string, unknown>;
  const slugsRaw = record.projectSlugs ?? record.slugs;
  const projectSlugs = Array.isArray(slugsRaw)
    ? slugsRaw.filter((slug): slug is string => typeof slug === 'string')
    : [];

  const reasonRaw = record.reason;
  if (typeof reasonRaw !== 'string' || !isCrmInactiveReason(reasonRaw)) {
    return null;
  }

  const customReasonRaw = record.customReason;
  const customReason =
    customReasonRaw == null
      ? null
      : typeof customReasonRaw === 'string'
        ? customReasonRaw
        : null;

  return {
    projectSlugs,
    reason: reasonRaw,
    customReason,
  };
}
