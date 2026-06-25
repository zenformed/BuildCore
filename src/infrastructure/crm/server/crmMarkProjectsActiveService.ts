import type { SupabaseClient } from '@supabase/supabase-js';
import type { BulkMarkActiveCrmProjectsResult } from '@/domain/crm/bulkMarkActiveProjects';
import type { MarkCrmProjectsActiveInput } from '@/domain/crm/subprojectStatus';
import { appendCrmAccountabilityEvent } from './crmAccountability';

export class CrmMarkProjectsActiveValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CrmMarkProjectsActiveValidationError';
  }
}

export async function markCrmProjectsActiveForOrg(
  supabase: SupabaseClient,
  organizationId: string,
  actorUserId: string,
  input: MarkCrmProjectsActiveInput
): Promise<BulkMarkActiveCrmProjectsResult> {
  const uniqueSlugs = [...new Set(input.projectSlugs.map((slug) => slug.trim()).filter(Boolean))];
  if (uniqueSlugs.length === 0) {
    throw new CrmMarkProjectsActiveValidationError('At least one subproject slug is required.');
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
    if (project.parent_project_id == null) return true;
    if (project.subproject_status !== 'inactive') return true;
    return false;
  });

  const toUpdate = uniqueSlugs
    .map((slug) => foundBySlug.get(slug))
    .filter((project): project is NonNullable<typeof project> => {
      if (project == null) return false;
      if (project.parent_project_id == null) return false;
      if (project.subproject_status !== 'inactive') return false;
      return true;
    });

  if (toUpdate.length === 0) {
    return { updatedCount: 0, updatedSlugs: [], failedSlugs };
  }

  const now = new Date().toISOString();
  const projectIds = toUpdate.map((project) => project.id as string);

  const { error: updateError } = await supabase
    .from('crm_projects')
    .update({
      subproject_status: 'normal',
      inactive_reason: null,
      inactive_reason_custom: null,
      inactive_at: null,
      inactive_by: null,
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
        eventType: 'project_marked_active',
        summary: `Marked subproject active: ${project.name as string}`,
        metadata: { slug: project.slug as string },
      })
    )
  );

  return {
    updatedCount: toUpdate.length,
    updatedSlugs: toUpdate.map((project) => project.slug as string),
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
