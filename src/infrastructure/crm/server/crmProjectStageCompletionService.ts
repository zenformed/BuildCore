import type { SupabaseClient } from '@supabase/supabase-js';
import type { CrmProjectDetail, PipelineStageSlug } from '@/domain/crm';
import { isPaymentWorkflowTask } from '@/domain/crm/paymentWorkflow';
import { resolveActiveWorkflowPipelineStages } from '@/domain/buildcore/projectPipelineProgress';
import { appendCrmAccountabilityEvent } from './crmAccountability';
import { getCrmProjectDetailBySlugForOrg } from './crmReadService';
import { loadOrganizationPipelineStageCatalog } from './pipelineStageService';

export class CrmProjectStageManualCompletionBlockedError extends Error {
  constructor(message = 'Only empty workflow stages can be marked complete manually') {
    super(message);
    this.name = 'CrmProjectStageManualCompletionBlockedError';
  }
}

export class CrmProjectStageManualCompletionInvalidStageError extends Error {
  constructor(message = 'Stage is not an active workflow stage for this organization') {
    super(message);
    this.name = 'CrmProjectStageManualCompletionInvalidStageError';
  }
}

export async function clearManualStageCompletionForProjectStage(
  supabase: SupabaseClient,
  organizationId: string,
  projectId: string,
  stageSlug: PipelineStageSlug
): Promise<void> {
  const { error } = await supabase
    .from('crm_project_stage_completions')
    .delete()
    .eq('organization_id', organizationId)
    .eq('project_id', projectId)
    .eq('stage_slug', stageSlug);

  if (error) throw new Error(error.message);
}

export async function markCrmProjectStageCompleteManualForOrg(
  supabase: SupabaseClient,
  organizationId: string,
  actorUserId: string,
  slug: string,
  stageSlug: PipelineStageSlug
): Promise<CrmProjectDetail | null> {
  const existing = await getCrmProjectDetailBySlugForOrg(supabase, organizationId, slug);
  if (existing == null) return null;

  const pipelineStages = await loadOrganizationPipelineStageCatalog(supabase, organizationId);
  const activeStageSlugs = new Set(
    resolveActiveWorkflowPipelineStages(pipelineStages).map((stage) => stage.slug)
  );
  if (!activeStageSlugs.has(stageSlug)) {
    throw new CrmProjectStageManualCompletionInvalidStageError();
  }

  const stageTasks = existing.workflowTasks.filter(
    (task) => !isPaymentWorkflowTask(task) && task.stageSlug === stageSlug
  );
  if (stageTasks.length > 0) {
    throw new CrmProjectStageManualCompletionBlockedError();
  }

  const now = new Date().toISOString();
  const { error: upsertError } = await supabase.from('crm_project_stage_completions').upsert(
    {
      organization_id: organizationId,
      project_id: existing.summary.id,
      stage_slug: stageSlug,
      completed_at: now,
      completed_by: actorUserId,
      source: 'manual',
    },
    { onConflict: 'project_id,stage_slug' }
  );

  if (upsertError) throw new Error(upsertError.message);

  await appendCrmAccountabilityEvent(supabase, {
    organizationId,
    projectId: existing.summary.id,
    actorMemberId: actorUserId,
    eventType: 'workflow_stage_manually_completed',
    summary: `Marked workflow stage ${stageSlug} as complete`,
    metadata: { slug, stageSlug, source: 'manual' },
  });

  await supabase
    .from('crm_projects')
    .update({ last_activity_at: now })
    .eq('id', existing.summary.id)
    .eq('organization_id', organizationId);

  return getCrmProjectDetailBySlugForOrg(supabase, organizationId, slug);
}

export async function clearCrmProjectStageManualCompletionForOrg(
  supabase: SupabaseClient,
  organizationId: string,
  actorUserId: string,
  slug: string,
  stageSlug: PipelineStageSlug
): Promise<CrmProjectDetail | null> {
  const existing = await getCrmProjectDetailBySlugForOrg(supabase, organizationId, slug);
  if (existing == null) return null;

  const pipelineStages = await loadOrganizationPipelineStageCatalog(supabase, organizationId);
  const activeStageSlugs = new Set(
    resolveActiveWorkflowPipelineStages(pipelineStages).map((stage) => stage.slug)
  );
  if (!activeStageSlugs.has(stageSlug)) {
    throw new CrmProjectStageManualCompletionInvalidStageError();
  }

  const stageTasks = existing.workflowTasks.filter(
    (task) => !isPaymentWorkflowTask(task) && task.stageSlug === stageSlug
  );
  if (stageTasks.length > 0) {
    throw new CrmProjectStageManualCompletionBlockedError(
      'Only empty workflow stages can be marked incomplete manually'
    );
  }

  const hadManualCompletion = existing.manualStageCompletions.some(
    (completion) => completion.stageSlug === stageSlug
  );
  if (!hadManualCompletion) {
    return existing;
  }

  await clearManualStageCompletionForProjectStage(
    supabase,
    organizationId,
    existing.summary.id,
    stageSlug
  );

  const now = new Date().toISOString();
  await appendCrmAccountabilityEvent(supabase, {
    organizationId,
    projectId: existing.summary.id,
    actorMemberId: actorUserId,
    eventType: 'workflow_stage_manual_completion_cleared',
    summary: `Marked workflow stage ${stageSlug} as incomplete`,
    metadata: { slug, stageSlug, source: 'manual' },
  });

  await supabase
    .from('crm_projects')
    .update({ last_activity_at: now })
    .eq('id', existing.summary.id)
    .eq('organization_id', organizationId);

  return getCrmProjectDetailBySlugForOrg(supabase, organizationId, slug);
}
