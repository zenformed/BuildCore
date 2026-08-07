import type { SupabaseClient } from '@supabase/supabase-js';
import type { BulkMarkActiveCrmProjectsResult } from '@/domain/crm/bulkMarkActiveProjects';
import type { MarkCrmProjectsActiveInput } from '@/domain/crm/projectStatus';
import { setCrmProjectsStatusForOrg } from './crmSetProjectsStatusService';

export class CrmMarkProjectsActiveValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CrmMarkProjectsActiveValidationError';
  }
}

/** Thin adapter: mark-active → unified status service (active). */
export async function markCrmProjectsActiveForOrg(
  supabase: SupabaseClient,
  organizationId: string,
  actorUserId: string,
  input: MarkCrmProjectsActiveInput
): Promise<BulkMarkActiveCrmProjectsResult> {
  const uniqueSlugs = [...new Set(input.projectSlugs.map((slug) => slug.trim()).filter(Boolean))];
  if (uniqueSlugs.length === 0) {
    throw new CrmMarkProjectsActiveValidationError('At least one project slug is required.');
  }

  const result = await setCrmProjectsStatusForOrg(supabase, organizationId, actorUserId, {
    projectSlugs: uniqueSlugs,
    status: 'active',
    lossReason: null,
    lossReasonOther: null,
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

export function parseMarkCrmProjectsActiveBody(body: unknown): MarkCrmProjectsActiveInput | null {
  if (body == null || typeof body !== 'object') return null;

  const record = body as Record<string, unknown>;
  const slugsRaw = record.projectSlugs ?? record.slugs;
  const projectSlugs = Array.isArray(slugsRaw)
    ? slugsRaw.filter((slug): slug is string => typeof slug === 'string')
    : [];

  if (projectSlugs.length === 0) return null;

  return { projectSlugs };
}
