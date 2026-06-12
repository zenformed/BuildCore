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
