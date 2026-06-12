import type { SupabaseClient } from '@supabase/supabase-js';
import type { CrmProjectDetail, PipelineStageSlug } from '@/domain/crm';
import { isPaymentWorkflowTask } from '@/domain/crm/paymentWorkflow';
import { listEmptyIncompleteWorkflowStages } from '@/domain/crm/projectStageCompletion';
import { resolveActiveWorkflowPipelineStages } from '@/domain/buildcore/projectPipelineProgress';
import { appendCrmAccountabilityEvent } from './crmAccountability';
import { resolveCrmProjectDetailForOrgRoute, type CrmProjectOrgRouteScope } from './resolveCrmProjectDetailForOrgRoute';
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

export class CrmProjectStageManualCompletionBatchEmptyError extends Error {
  constructor(message = 'No empty incomplete workflow stages to mark complete') {
    super(message);
    this.name = 'CrmProjectStageManualCompletionBatchEmptyError';
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

async function upsertManualCompletionForEmptyStage(
  supabase: SupabaseClient,
  organizationId: string,
  actorUserId: string,
  project: CrmProjectDetail,
  stageSlug: PipelineStageSlug,
  activeStageSlugs: ReadonlySet<string>
): Promise<void> {
  if (!activeStageSlugs.has(stageSlug)) {
    throw new CrmProjectStageManualCompletionInvalidStageError();
  }

  const stageTasks = project.workflowTasks.filter(
    (task) => !isPaymentWorkflowTask(task) && task.stageSlug === stageSlug
  );
  if (stageTasks.length > 0) {
    throw new CrmProjectStageManualCompletionBlockedError();
  }

  const now = new Date().toISOString();
  const { error: upsertError } = await supabase.from('crm_project_stage_completions').upsert(
    {
      organization_id: organizationId,
      project_id: project.summary.id,
      stage_slug: stageSlug,
      completed_at: now,
      completed_by: actorUserId,
      source: 'manual',
    },
    { onConflict: 'project_id,stage_slug' }
  );

  if (upsertError) throw new Error(upsertError.message);
}

export async function markCrmProjectStageCompleteManualForOrg(
  supabase: SupabaseClient,
  organizationId: string,
  actorUserId: string,
  slug: string,
  stageSlug: PipelineStageSlug,
  scope?: CrmProjectOrgRouteScope
): Promise<CrmProjectDetail | null> {
  const existing = await resolveCrmProjectDetailForOrgRoute(
    supabase,
    organizationId,
    slug,
    scope
  );
  if (existing == null) return null;

  const pipelineStages = await loadOrganizationPipelineStageCatalog(supabase, organizationId);
  const activeStageSlugs = new Set(
    resolveActiveWorkflowPipelineStages(pipelineStages).map((stage) => stage.slug)
  );

  await upsertManualCompletionForEmptyStage(
    supabase,
    organizationId,
    actorUserId,
    existing,
    stageSlug,
    activeStageSlugs
  );

  const now = new Date().toISOString();
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

  return resolveCrmProjectDetailForOrgRoute(supabase, organizationId, slug, scope);
}

export async function markCrmProjectEmptyStagesCompleteBatchForOrg(
  supabase: SupabaseClient,
  organizationId: string,
  actorUserId: string,
  slug: string,
  scope?: CrmProjectOrgRouteScope
): Promise<CrmProjectDetail | null> {
  const existing = await resolveCrmProjectDetailForOrgRoute(
    supabase,
    organizationId,
    slug,
    scope
  );
  if (existing == null) return null;

  const pipelineStages = await loadOrganizationPipelineStageCatalog(supabase, organizationId);
  const activeStageSlugs = new Set(
    resolveActiveWorkflowPipelineStages(pipelineStages).map((stage) => stage.slug)
  );
  const emptyIncompleteStages = listEmptyIncompleteWorkflowStages({
    workflowTasks: existing.workflowTasks,
    stages: pipelineStages,
    manualStageCompletions: existing.manualStageCompletions,
  });

  if (emptyIncompleteStages.length === 0) {
    throw new CrmProjectStageManualCompletionBatchEmptyError();
  }

  for (const stage of emptyIncompleteStages) {
    await upsertManualCompletionForEmptyStage(
      supabase,
      organizationId,
      actorUserId,
      existing,
      stage.stageSlug,
      activeStageSlugs
    );
  }

  const now = new Date().toISOString();
  const stageSlugs = emptyIncompleteStages.map((stage) => stage.stageSlug);
  await appendCrmAccountabilityEvent(supabase, {
    organizationId,
    projectId: existing.summary.id,
    actorMemberId: actorUserId,
    eventType: 'workflow_stage_manually_completed',
    summary: `Marked ${stageSlugs.length} empty workflow stages as complete`,
    metadata: { slug, stageSlugs, source: 'manual', batch: true },
  });

  await supabase
    .from('crm_projects')
    .update({ last_activity_at: now })
    .eq('id', existing.summary.id)
    .eq('organization_id', organizationId);

  return resolveCrmProjectDetailForOrgRoute(supabase, organizationId, slug, scope);
}

export async function clearCrmProjectStageManualCompletionForOrg(
  supabase: SupabaseClient,
  organizationId: string,
  actorUserId: string,
  slug: string,
  stageSlug: PipelineStageSlug,
  scope?: CrmProjectOrgRouteScope
): Promise<CrmProjectDetail | null> {
  const existing = await resolveCrmProjectDetailForOrgRoute(
    supabase,
    organizationId,
    slug,
    scope
  );
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

  return resolveCrmProjectDetailForOrgRoute(supabase, organizationId, slug, scope);
}
