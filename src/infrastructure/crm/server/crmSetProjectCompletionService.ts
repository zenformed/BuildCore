import type { SupabaseClient } from '@supabase/supabase-js';
import type { CrmProjectDetail } from '@/domain/crm';
import { appendCrmAccountabilityEvent } from './crmAccountability';
import { getCrmProjectDetailBySlugForOrg } from './crmReadService';

export async function setCrmProjectCompletionBySlugForOrg(
  supabase: SupabaseClient,
  organizationId: string,
  actorUserId: string,
  slug: string,
  complete: boolean
): Promise<CrmProjectDetail | null> {
  const existing = await getCrmProjectDetailBySlugForOrg(supabase, organizationId, slug);
  if (existing == null) return null;

  const now = new Date().toISOString();

  const { error: projectError } = await supabase
    .from('crm_projects')
    .update({
      completed_at: complete ? now : null,
      completed_by: complete ? actorUserId : null,
      last_activity_at: now,
    })
    .eq('id', existing.summary.id)
    .eq('organization_id', organizationId);

  if (projectError) throw new Error(projectError.message);

  await appendCrmAccountabilityEvent(supabase, {
    organizationId,
    projectId: existing.summary.id,
    actorMemberId: actorUserId,
    eventType: complete ? 'project_marked_complete' : 'project_marked_incomplete',
    summary: complete
      ? `Marked project ${existing.summary.name} as complete`
      : `Marked project ${existing.summary.name} as incomplete`,
    metadata: { slug, complete },
  });

  return getCrmProjectDetailBySlugForOrg(supabase, organizationId, slug);
}
