import type { SupabaseClient } from '@supabase/supabase-js';
import type { BulkMarkInactiveCrmProjectsResult } from '@/domain/crm/bulkMarkInactiveProjects';
import {
  isCrmInactiveReason,
  validateMarkCrmProjectsInactiveInput,
  type CrmInactiveReason,
  type MarkCrmProjectsInactiveInput,
} from '@/domain/crm/subprojectStatus';
import { appendCrmAccountabilityEvent } from './crmAccountability';

export class CrmMarkProjectsInactiveValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CrmMarkProjectsInactiveValidationError';
  }
}

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

  const uniqueSlugs = [...new Set(input.projectSlugs.map((slug) => slug.trim()).filter(Boolean))];
  if (uniqueSlugs.length === 0) {
    return { updatedCount: 0, updatedSlugs: [], failedSlugs: [] };
  }

  const { data: projects, error: fetchError } = await supabase
    .from('crm_projects')
    .select('id, name, slug, parent_project_id, subproject_status')
    .eq('organization_id', organizationId)
    .in('slug', uniqueSlugs)
    .is('archived_at', null);

  if (fetchError) throw new Error(fetchError.message);

  const foundBySlug = new Map((projects ?? []).map((project) => [project.slug as string, project]));
  const failedSlugs: string[] = uniqueSlugs.filter((slug) => {
    const project = foundBySlug.get(slug);
    if (project == null) return true;
    if (project.subproject_status === 'inactive') return true;
    return false;
  });

  const toUpdate = uniqueSlugs
    .map((slug) => foundBySlug.get(slug))
    .filter((project): project is NonNullable<typeof project> => {
      if (project == null) return false;
      if (project.subproject_status === 'inactive') return false;
      return true;
    });

  if (toUpdate.length === 0) {
    return { updatedCount: 0, updatedSlugs: [], failedSlugs };
  }

  const now = new Date().toISOString();
  const reason = input.reason as CrmInactiveReason;
  const customReason =
    reason === 'other' ? input.customReason?.trim() ?? null : null;

  const projectIds = toUpdate.map((project) => project.id as string);

  const { error: updateError } = await supabase
    .from('crm_projects')
    .update({
      subproject_status: 'inactive',
      inactive_reason: reason,
      inactive_reason_custom: customReason,
      inactive_at: now,
      inactive_by: actorUserId,
      last_activity_at: now,
    })
    .in('id', projectIds)
    .eq('organization_id', organizationId);

  if (updateError) throw new Error(updateError.message);

  await Promise.all(
    toUpdate.map((project) =>
      appendCrmAccountabilityEvent(supabase, {
        organizationId,
        projectId: project.id as string,
        actorMemberId: actorUserId,
        eventType: 'project_marked_inactive',
        summary: `Marked project inactive: ${project.name as string}`,
        metadata: {
          slug: project.slug as string,
          reason,
          customReason,
        },
      })
    )
  );

  return {
    updatedCount: toUpdate.length,
    updatedSlugs: toUpdate.map((project) => project.slug as string),
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
