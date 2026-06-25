import type { SupabaseClient } from '@supabase/supabase-js';
import type { CrmProjectDetail } from '@/domain/crm';
import { canMarkProjectCompleteByWorkflowTasks } from '@/domain/buildcore/projectPipelineProgress';
import { CRM_PROJECT_COMPLETE_STAGE_SLUG } from '@/domain/crm/projectCompletion';
import { appendCrmAccountabilityEvent } from './crmAccountability';
import { getCrmProjectDetailBySlugForOrg } from './crmReadService';
import { loadOrganizationPipelineStageCatalogForProject } from './pipelineStageService';

export class CrmProjectCompletionBlockedError extends Error {
  constructor(message = 'All workflow tasks must be done before marking this project complete') {
    super(message);
    this.name = 'CrmProjectCompletionBlockedError';
  }
}

export async function setCrmProjectCompletionBySlugForOrg(
  supabase: SupabaseClient,
  organizationId: string,
  actorUserId: string,
  slug: string,
  complete: boolean
): Promise<CrmProjectDetail | null> {
  const existing = await getCrmProjectDetailBySlugForOrg(supabase, organizationId, slug);
  if (existing == null) return null;

  if (complete) {
    const pipelineStages = await loadOrganizationPipelineStageCatalogForProject(
      supabase,
      organizationId,
      existing.summary
    );
    if (!canMarkProjectCompleteByWorkflowTasks({
      workflowTasks: existing.workflowTasks,
      stages: pipelineStages,
      manualStageCompletions: existing.manualStageCompletions,
    })) {
      throw new CrmProjectCompletionBlockedError();
    }
  }

  const now = new Date().toISOString();

  const { error: projectError } = await supabase
    .from('crm_projects')
    .update({
      completed_at: complete ? now : null,
      completed_by: complete ? actorUserId : null,
      last_activity_at: now,
      subproject_status: complete
        ? 'completed'
        : existing.summary.subprojectStatus === 'inactive'
          ? 'inactive'
          : existing.summary.priority === 'urgent'
            ? 'urgent'
            : 'normal',
      ...(complete
        ? { priority: 'low', current_stage_slug: CRM_PROJECT_COMPLETE_STAGE_SLUG }
        : {}),
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
