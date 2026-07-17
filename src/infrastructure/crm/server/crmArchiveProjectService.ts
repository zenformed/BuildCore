import type { SupabaseClient } from '@supabase/supabase-js';
import { appendCrmAccountabilityEvent } from './crmAccountability';

async function listActiveChildProjects(
  supabase: SupabaseClient,
  organizationId: string,
  parentProjectIds: readonly string[]
): Promise<readonly { readonly id: string; readonly name: string }[]> {
  if (parentProjectIds.length === 0) return [];

  const { data, error } = await supabase
    .from('crm_projects')
    .select('id, name')
    .eq('organization_id', organizationId)
    .in('parent_project_id', parentProjectIds)
    .is('archived_at', null);

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    id: row.id as string,
    name: row.name as string,
  }));
}

async function archiveProjectsAndTasksByIds(
  supabase: SupabaseClient,
  organizationId: string,
  actorUserId: string,
  projects: readonly { readonly id: string; readonly name: string }[],
  now: string
): Promise<void> {
  if (projects.length === 0) return;

  const projectIds = projects.map((project) => project.id);

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
    projects.map((project) =>
      appendCrmAccountabilityEvent(supabase, {
        organizationId,
        projectId: project.id,
        actorMemberId: actorUserId,
        eventType: 'project_archived',
        summary: `Archived project: ${project.name}`,
      })
    )
  );
}

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
  const childProjects = await listActiveChildProjects(supabase, organizationId, [
    project.id as string,
  ]);

  await archiveProjectsAndTasksByIds(
    supabase,
    organizationId,
    actorUserId,
    [{ id: project.id as string, name: project.name as string }, ...childProjects],
    now
  );

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
  const parentIds = toArchive.map((project) => project.id as string);
  const childProjects = await listActiveChildProjects(supabase, organizationId, parentIds);
  const selectedIdSet = new Set(parentIds);
  const cascadeChildren = childProjects.filter((child) => !selectedIdSet.has(child.id));

  const projectsToArchive = [
    ...toArchive.map((project) => ({
      id: project.id as string,
      name: project.name as string,
    })),
    ...cascadeChildren,
  ];

  await archiveProjectsAndTasksByIds(
    supabase,
    organizationId,
    actorUserId,
    projectsToArchive,
    now
  );

  return {
    deletedCount: toArchive.length,
    deletedSlugs: toArchive.map((project) => project.slug as string),
    failedSlugs,
  };
}
