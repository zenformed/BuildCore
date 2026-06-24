import type { SupabaseClient } from '@supabase/supabase-js';
import { appendCrmAccountabilityEvent } from './crmAccountability';

export async function archiveCrmProjectBySlugForOrg(
  supabase: SupabaseClient,
  organizationId: string,
  actorUserId: string,
  slug: string
): Promise<boolean> {
  const trimmedSlug = slug.trim();
  if (!trimmedSlug) return false;

  const { data: project, error: fetchError } = await supabase
    .from('crm_projects')
    .select('id, name')
    .eq('organization_id', organizationId)
    .eq('slug', trimmedSlug)
    .is('archived_at', null)
    .maybeSingle();

  if (fetchError) throw new Error(fetchError.message);
  if (project == null) return false;

  const now = new Date().toISOString();
  const { error } = await supabase
    .from('crm_projects')
    .update({ archived_at: now })
    .eq('id', project.id)
    .eq('organization_id', organizationId);

  if (error) throw new Error(error.message);

  const { error: archiveTasksError } = await supabase
    .from('crm_workflow_tasks')
    .update({ archived_at: now })
    .eq('project_id', project.id)
    .eq('organization_id', organizationId)
    .is('archived_at', null);

  if (archiveTasksError) throw new Error(archiveTasksError.message);

  await appendCrmAccountabilityEvent(supabase, {
    organizationId,
    projectId: project.id,
    actorMemberId: actorUserId,
    eventType: 'project_archived',
    summary: `Archived project: ${project.name}`,
  });

  return true;
}

export async function bulkArchiveCrmProjectsBySlugsForOrg(
  supabase: SupabaseClient,
  organizationId: string,
  actorUserId: string,
  slugs: readonly string[]
): Promise<{ deletedCount: number; deletedSlugs: string[]; failedSlugs: string[] }> {
  const uniqueSlugs = [...new Set(slugs.map((slug) => slug.trim()).filter(Boolean))];
  if (uniqueSlugs.length === 0) {
    return { deletedCount: 0, deletedSlugs: [], failedSlugs: [] };
  }

  const { data: projects, error: fetchError } = await supabase
    .from('crm_projects')
    .select('id, name, slug')
    .eq('organization_id', organizationId)
    .in('slug', uniqueSlugs)
    .is('archived_at', null);

  if (fetchError) throw new Error(fetchError.message);

  const foundBySlug = new Map((projects ?? []).map((project) => [project.slug as string, project]));
  const failedSlugs = uniqueSlugs.filter((slug) => !foundBySlug.has(slug));
  const toArchive = [...foundBySlug.values()];

  if (toArchive.length === 0) {
    return { deletedCount: 0, deletedSlugs: [], failedSlugs };
  }

  const now = new Date().toISOString();
  const projectIds = toArchive.map((project) => project.id as string);

  const { error: archiveProjectsError } = await supabase
    .from('crm_projects')
    .update({ archived_at: now })
    .in('id', projectIds)
    .eq('organization_id', organizationId);

  if (archiveProjectsError) throw new Error(archiveProjectsError.message);

  const { error: archiveTasksError } = await supabase
    .from('crm_workflow_tasks')
    .update({ archived_at: now })
    .in('project_id', projectIds)
    .eq('organization_id', organizationId)
    .is('archived_at', null);

  if (archiveTasksError) throw new Error(archiveTasksError.message);

  await Promise.all(
    toArchive.map((project) =>
      appendCrmAccountabilityEvent(supabase, {
        organizationId,
        projectId: project.id as string,
        actorMemberId: actorUserId,
        eventType: 'project_archived',
        summary: `Archived project: ${project.name as string}`,
      })
    )
  );

  return {
    deletedCount: toArchive.length,
    deletedSlugs: toArchive.map((project) => project.slug as string),
    failedSlugs,
  };
}
