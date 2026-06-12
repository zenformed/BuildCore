import type { SupabaseClient } from '@supabase/supabase-js';

import {

  DEFAULT_PIPELINE_STAGES,

  type PipelineStage,

} from '@/domain/crm/pipelineStage';

import {

  BUILDCORE_TERMINAL_PIPELINE_STAGE_LABEL,

  BUILDCORE_TERMINAL_PIPELINE_STAGE_SLUG,

  ensureUniquePipelineStageSlug,

  findTerminalPipelineStageRecord,

  isInternalWorkflowStageSlug,

  isReservedPipelineStageSlug,

  orderPipelineStageIdsWithTerminalLast,

  orgPipelineStageRecordsToPipelineStages,

  slugifyPipelineStageLabel,

  type OrgPipelineStageRecord,

} from '@/domain/buildcore/orgPipelineStages';

import { loadActiveOrganizationMemberRole } from './buildCoreWorkflowTaskVisibilityService';

import { organizationRoleCanManagePipelineStages } from '@/domain/buildcore/orgPipelineStages';



type DbPipelineStageRow = {

  id: string;

  organization_id: string | null;

  slug: string;

  label: string;

  sort_order: number;

  is_active: boolean;

};



export type BuildCorePipelineStagesResponse = {

  readonly stages: readonly OrgPipelineStageRecord[];

  readonly catalog: readonly PipelineStage[];

  readonly canManage: boolean;

};



function mapPipelineStageRow(row: DbPipelineStageRow): OrgPipelineStageRecord | null {

  if (row.organization_id == null) return null;

  return {

    id: row.id,

    organizationId: row.organization_id,

    slug: row.slug,

    label: row.label,

    sortOrder: row.sort_order,

    isActive: row.is_active,

  };

}



async function loadGlobalDefaultStageRows(

  supabase: SupabaseClient

): Promise<readonly DbPipelineStageRow[]> {

  const { data, error } = await supabase

    .from('crm_pipeline_stages')

    .select('id, organization_id, slug, label, sort_order, is_active')

    .is('organization_id', null)

    .eq('is_active', true)

    .order('sort_order', { ascending: true });



  if (error != null) throw new Error(error.message);

  return (data ?? []) as DbPipelineStageRow[];

}



async function loadOrgPipelineStageRows(

  supabase: SupabaseClient,

  organizationId: string

): Promise<OrgPipelineStageRecord[]> {

  const { data, error } = await supabase

    .from('crm_pipeline_stages')

    .select('id, organization_id, slug, label, sort_order, is_active')

    .eq('organization_id', organizationId)

    .eq('is_active', true)

    .order('sort_order', { ascending: true });



  if (error != null) throw new Error(error.message);

  return ((data ?? []) as DbPipelineStageRow[])

    .map(mapPipelineStageRow)

    .filter((row): row is OrgPipelineStageRecord => row != null);

}



async function seedOrganizationPipelineStagesFromDefaults(

  supabase: SupabaseClient,

  organizationId: string

): Promise<OrgPipelineStageRecord[]> {

  const globals = await loadGlobalDefaultStageRows(supabase);

  const source =

    globals.length > 0

      ? globals

      : DEFAULT_PIPELINE_STAGES.map((stage, index) => ({

          id: `fallback-${stage.slug}`,

          organization_id: null,

          slug: stage.slug,

          label: stage.label,

          sort_order: index + 1,

          is_active: true,

        }));



  const rows = source.map((stage) => ({

    organization_id: organizationId,

    slug: stage.slug,

    label: stage.label,

    sort_order: stage.sort_order,

    is_active: true,

  }));



  const { error } = await supabase.from('crm_pipeline_stages').insert(rows);

  if (error != null) throw new Error(error.message);

  return ensureTerminalPipelineStageForOrg(supabase, organizationId);

}



async function ensureTerminalPipelineStageForOrg(

  supabase: SupabaseClient,

  organizationId: string

): Promise<OrgPipelineStageRecord[]> {

  const stages = await loadOrgPipelineStageRows(supabase, organizationId);

  const terminal = findTerminalPipelineStageRecord(stages);



  if (terminal == null) {

    const nextSortOrder = stages.reduce((max, stage) => Math.max(max, stage.sortOrder), 0) + 1;

    const { error } = await supabase.from('crm_pipeline_stages').insert({

      organization_id: organizationId,

      slug: BUILDCORE_TERMINAL_PIPELINE_STAGE_SLUG,

      label: BUILDCORE_TERMINAL_PIPELINE_STAGE_LABEL,

      sort_order: nextSortOrder,

      is_active: true,

    });

    if (error != null) throw new Error(error.message);

    return ensureTerminalPipelineStageForOrg(supabase, organizationId);

  }



  const maxSortOrder = stages.reduce((max, stage) => Math.max(max, stage.sortOrder), 0);

  if (terminal.sortOrder >= maxSortOrder) {

    return stages;

  }



  await normalizeOrganizationPipelineStageSortOrder(

    supabase,

    organizationId,

    orderPipelineStageIdsWithTerminalLast(

      stages,

      stages

        .slice()

        .sort((a, b) => a.sortOrder - b.sortOrder)

        .map((stage) => stage.id)

    )

  );



  return loadOrgPipelineStageRows(supabase, organizationId);

}



export async function ensureOrganizationPipelineStages(

  supabase: SupabaseClient,

  organizationId: string

): Promise<OrgPipelineStageRecord[]> {

  const existing = await loadOrgPipelineStageRows(supabase, organizationId);

  if (existing.length === 0) {

    return seedOrganizationPipelineStagesFromDefaults(supabase, organizationId);

  }

  return ensureTerminalPipelineStageForOrg(supabase, organizationId);

}



export async function buildBuildCorePipelineStagesResponse(

  supabase: SupabaseClient,

  organizationId: string,

  userId: string

): Promise<BuildCorePipelineStagesResponse> {

  const [stages, actorRole] = await Promise.all([

    ensureOrganizationPipelineStages(supabase, organizationId),

    loadActiveOrganizationMemberRole(supabase, organizationId, userId),

  ]);



  return {

    stages,

    catalog: orgPipelineStageRecordsToPipelineStages(stages),

    canManage: organizationRoleCanManagePipelineStages(actorRole),

  };

}



export async function loadOrganizationPipelineStageCatalog(

  supabase: SupabaseClient,

  organizationId: string

): Promise<readonly PipelineStage[]> {

  const stages = await ensureOrganizationPipelineStages(supabase, organizationId);

  return orgPipelineStageRecordsToPipelineStages(stages);

}



export async function createOrganizationPipelineStage(

  supabase: SupabaseClient,

  organizationId: string,

  userId: string,

  label: string

): Promise<BuildCorePipelineStagesResponse> {

  const actorRole = await loadActiveOrganizationMemberRole(supabase, organizationId, userId);

  if (!organizationRoleCanManagePipelineStages(actorRole)) {

    throw new Error('You do not have permission to manage workflow stages.');

  }



  const trimmedLabel = label.trim();

  if (!trimmedLabel) {

    throw new Error('Stage name is required.');

  }



  const existing = await ensureOrganizationPipelineStages(supabase, organizationId);

  const terminal = findTerminalPipelineStageRecord(existing);

  const takenSlugs = new Set(existing.map((stage) => stage.slug));

  let slug = ensureUniquePipelineStageSlug(slugifyPipelineStageLabel(trimmedLabel), takenSlugs);

  if (isReservedPipelineStageSlug(slug) || isInternalWorkflowStageSlug(slug)) {

    slug = ensureUniquePipelineStageSlug(`${slug}-stage`, takenSlugs);

  }



  const insertSortOrder = terminal?.sortOrder ?? existing.reduce((max, stage) => Math.max(max, stage.sortOrder), 0) + 1;



  if (terminal != null) {

    const { error: bumpError } = await supabase

      .from('crm_pipeline_stages')

      .update({ sort_order: insertSortOrder + 1 })

      .eq('organization_id', organizationId)

      .eq('id', terminal.id);

    if (bumpError != null) throw new Error(bumpError.message);

  }



  const { error } = await supabase.from('crm_pipeline_stages').insert({

    organization_id: organizationId,

    slug,

    label: trimmedLabel,

    sort_order: insertSortOrder,

    is_active: true,

  });

  if (error != null) throw new Error(error.message);



  return buildBuildCorePipelineStagesResponse(supabase, organizationId, userId);

}



export async function renameOrganizationPipelineStage(

  supabase: SupabaseClient,

  organizationId: string,

  userId: string,

  stageId: string,

  label: string

): Promise<BuildCorePipelineStagesResponse> {

  const actorRole = await loadActiveOrganizationMemberRole(supabase, organizationId, userId);

  if (!organizationRoleCanManagePipelineStages(actorRole)) {

    throw new Error('You do not have permission to manage workflow stages.');

  }



  const trimmedLabel = label.trim();

  if (!trimmedLabel) {

    throw new Error('Stage name is required.');

  }



  const { data, error } = await supabase

    .from('crm_pipeline_stages')

    .update({ label: trimmedLabel })

    .eq('organization_id', organizationId)

    .eq('id', stageId)

    .eq('is_active', true)

    .select('id')

    .maybeSingle();



  if (error != null) throw new Error(error.message);

  if (data == null) throw new Error('Workflow stage not found.');



  return buildBuildCorePipelineStagesResponse(supabase, organizationId, userId);

}



async function countPipelineStageUsage(

  supabase: SupabaseClient,

  organizationId: string,

  slug: string

): Promise<number> {

  const [projectsResult, tasksResult] = await Promise.all([

    supabase

      .from('crm_projects')

      .select('id', { count: 'exact', head: true })

      .eq('organization_id', organizationId)

      .eq('current_stage_slug', slug)

      .is('archived_at', null),

    supabase

      .from('crm_workflow_tasks')

      .select('id', { count: 'exact', head: true })

      .eq('organization_id', organizationId)

      .eq('stage_slug', slug)

      .is('amount_cents', null)

      .is('archived_at', null),

  ]);



  if (projectsResult.error != null) throw new Error(projectsResult.error.message);

  if (tasksResult.error != null) throw new Error(tasksResult.error.message);



  return (projectsResult.count ?? 0) + (tasksResult.count ?? 0);

}



export async function deleteOrganizationPipelineStage(

  supabase: SupabaseClient,

  organizationId: string,

  userId: string,

  stageId: string

): Promise<BuildCorePipelineStagesResponse> {

  const actorRole = await loadActiveOrganizationMemberRole(supabase, organizationId, userId);

  if (!organizationRoleCanManagePipelineStages(actorRole)) {

    throw new Error('You do not have permission to manage workflow stages.');

  }



  const stages = await ensureOrganizationPipelineStages(supabase, organizationId);

  const target = stages.find((stage) => stage.id === stageId);

  if (target == null) throw new Error('Workflow stage not found.');

  if (isReservedPipelineStageSlug(target.slug)) {

    throw new Error('Complete is the terminal workflow stage and cannot be deleted.');

  }

  if (stages.length <= 1) {

    throw new Error('At least one workflow stage must remain.');

  }



  const usageCount = await countPipelineStageUsage(supabase, organizationId, target.slug);

  if (usageCount > 0) {

    throw new Error('This stage is still used by projects or tasks and cannot be deleted.');

  }



  const { error } = await supabase

    .from('crm_pipeline_stages')

    .delete()

    .eq('organization_id', organizationId)

    .eq('id', stageId);



  if (error != null) throw new Error(error.message);



  const remaining = await loadOrgPipelineStageRows(supabase, organizationId);

  await normalizeOrganizationPipelineStageSortOrder(

    supabase,

    organizationId,

    orderPipelineStageIdsWithTerminalLast(

      remaining,

      remaining

        .slice()

        .sort((a, b) => a.sortOrder - b.sortOrder)

        .map((stage) => stage.id)

    )

  );



  return buildBuildCorePipelineStagesResponse(supabase, organizationId, userId);

}



async function normalizeOrganizationPipelineStageSortOrder(

  supabase: SupabaseClient,

  organizationId: string,

  orderedStageIds: readonly string[]

): Promise<void> {

  await Promise.all(

    orderedStageIds.map((stageId, index) =>

      supabase

        .from('crm_pipeline_stages')

        .update({ sort_order: index + 1 })

        .eq('organization_id', organizationId)

        .eq('id', stageId)

    )

  );

}



export async function reorderOrganizationPipelineStages(

  supabase: SupabaseClient,

  organizationId: string,

  userId: string,

  orderedStageIds: readonly string[]

): Promise<BuildCorePipelineStagesResponse> {

  const actorRole = await loadActiveOrganizationMemberRole(supabase, organizationId, userId);

  if (!organizationRoleCanManagePipelineStages(actorRole)) {

    throw new Error('You do not have permission to manage workflow stages.');

  }



  const stages = await ensureOrganizationPipelineStages(supabase, organizationId);

  const existingIds = new Set(stages.map((stage) => stage.id));

  if (orderedStageIds.length !== stages.length) {

    throw new Error('Stage order payload is invalid.');

  }

  for (const stageId of orderedStageIds) {

    if (!existingIds.has(stageId)) {

      throw new Error('Stage order payload is invalid.');

    }

  }



  const normalizedOrder = orderPipelineStageIdsWithTerminalLast(stages, orderedStageIds);

  await normalizeOrganizationPipelineStageSortOrder(supabase, organizationId, normalizedOrder);

  return buildBuildCorePipelineStagesResponse(supabase, organizationId, userId);

}



export function buildDefaultBuildCorePipelineStagesResponse(): BuildCorePipelineStagesResponse {

  const stages = DEFAULT_PIPELINE_STAGES.map((stage, index) => ({

    id: `mock-stage-${stage.slug}`,

    organizationId: 'mock-org',

    slug: stage.slug,

    label: stage.label,

    sortOrder: index + 1,

    isActive: true,

  }));



  return {

    stages,

    catalog: DEFAULT_PIPELINE_STAGES,

    canManage: true,

  };

}


