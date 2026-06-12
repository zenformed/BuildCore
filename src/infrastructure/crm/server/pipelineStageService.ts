import type { SupabaseClient } from '@supabase/supabase-js';

import { DEFAULT_PIPELINE_STAGES, type PipelineStage } from '@/domain/crm/pipelineStage';
import {
  BUILDCORE_TERMINAL_PIPELINE_STAGE_LABEL,
  BUILDCORE_TERMINAL_PIPELINE_STAGE_SLUG,
  ensureUniquePipelineStageSlug,
  findTerminalPipelineStageRecord,
  isBuildCoreProjectTemplateScope,
  isInternalWorkflowStageSlug,
  isReservedPipelineStageSlug,
  orderPipelineStageIdsWithTerminalLast,
  orgPipelineStageRecordsToPipelineStages,
  slugifyPipelineStageLabel,
  type OrgPipelineStageRecord,
  type PipelineStageScope,
} from '@/domain/buildcore/orgPipelineStages';
import { loadActiveOrganizationMemberRole } from './buildCoreWorkflowTaskVisibilityService';
import { organizationRoleCanManagePipelineStages } from '@/domain/buildcore/orgPipelineStages';

type DbPipelineStageRow = {
  id: string;
  organization_id: string | null;
  stage_scope: string;
  slug: string;
  label: string;
  sort_order: number;
  is_active: boolean;
};

export type BuildCorePipelineStagesResponse = {
  readonly scope: PipelineStageScope;
  readonly stages: readonly OrgPipelineStageRecord[];
  readonly catalog: readonly PipelineStage[];
  readonly canManage: boolean;
};

export type BuildCorePipelineStagesBothScopesResponse = {
  readonly project: BuildCorePipelineStagesResponse;
  readonly subproject: BuildCorePipelineStagesResponse;
  readonly canManage: boolean;
};

const STAGE_SELECT =
  'id, organization_id, stage_scope, slug, label, sort_order, is_active';

function mapPipelineStageRow(row: DbPipelineStageRow): OrgPipelineStageRecord | null {
  if (row.organization_id == null) return null;
  if (!isBuildCoreProjectTemplateScope(row.stage_scope)) return null;
  return {
    id: row.id,
    organizationId: row.organization_id,
    stageScope: row.stage_scope,
    slug: row.slug,
    label: row.label,
    sortOrder: row.sort_order,
    isActive: row.is_active,
  };
}

export function parsePipelineStageScope(value: string | null | undefined): PipelineStageScope | null {
  if (value == null) return null;
  const normalized = value.trim();
  return isBuildCoreProjectTemplateScope(normalized) ? normalized : null;
}

async function loadGlobalDefaultStageRows(
  supabase: SupabaseClient,
  scope: PipelineStageScope
): Promise<readonly DbPipelineStageRow[]> {
  const { data, error } = await supabase
    .from('crm_pipeline_stages')
    .select(STAGE_SELECT)
    .is('organization_id', null)
    .eq('stage_scope', scope)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error != null) throw new Error(error.message);
  return (data ?? []) as DbPipelineStageRow[];
}

async function loadOrgPipelineStageRows(
  supabase: SupabaseClient,
  organizationId: string,
  scope: PipelineStageScope
): Promise<OrgPipelineStageRecord[]> {
  const { data, error } = await supabase
    .from('crm_pipeline_stages')
    .select(STAGE_SELECT)
    .eq('organization_id', organizationId)
    .eq('stage_scope', scope)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error != null) throw new Error(error.message);
  return ((data ?? []) as DbPipelineStageRow[])
    .map(mapPipelineStageRow)
    .filter((row): row is OrgPipelineStageRecord => row != null);
}

async function copyProjectScopeStagesToSubprojectScope(
  supabase: SupabaseClient,
  organizationId: string
): Promise<void> {
  const { data, error } = await supabase
    .from('crm_pipeline_stages')
    .select(STAGE_SELECT)
    .eq('organization_id', organizationId)
    .eq('stage_scope', 'project');

  if (error != null) throw new Error(error.message);

  const projectRows = (data ?? []) as DbPipelineStageRow[];
  if (projectRows.length === 0) return;

  const rows = projectRows.map((stage) => ({
    organization_id: organizationId,
    stage_scope: 'subproject',
    slug: stage.slug,
    label: stage.label,
    sort_order: stage.sort_order,
    is_active: stage.is_active,
  }));

  const { error: insertError } = await supabase.from('crm_pipeline_stages').insert(rows);
  if (insertError != null) throw new Error(insertError.message);
}

async function seedOrganizationPipelineStagesFromDefaults(
  supabase: SupabaseClient,
  organizationId: string,
  scope: PipelineStageScope
): Promise<OrgPipelineStageRecord[]> {
  const globals = await loadGlobalDefaultStageRows(supabase, scope);
  const source =
    globals.length > 0
      ? globals
      : DEFAULT_PIPELINE_STAGES.map((stage, index) => ({
          id: `fallback-${scope}-${stage.slug}`,
          organization_id: null,
          stage_scope: scope,
          slug: stage.slug,
          label: stage.label,
          sort_order: index + 1,
          is_active: true,
        }));

  const rows = source.map((stage) => ({
    organization_id: organizationId,
    stage_scope: scope,
    slug: stage.slug,
    label: stage.label,
    sort_order: stage.sort_order,
    is_active: true,
  }));

  const { error } = await supabase.from('crm_pipeline_stages').insert(rows);
  if (error != null) throw new Error(error.message);

  return ensureTerminalPipelineStageForOrg(supabase, organizationId, scope);
}

async function ensureTerminalPipelineStageForOrg(
  supabase: SupabaseClient,
  organizationId: string,
  scope: PipelineStageScope
): Promise<OrgPipelineStageRecord[]> {
  const stages = await loadOrgPipelineStageRows(supabase, organizationId, scope);
  const terminal = findTerminalPipelineStageRecord(stages);

  if (terminal == null) {
    const nextSortOrder = stages.reduce((max, stage) => Math.max(max, stage.sortOrder), 0) + 1;
    const { error } = await supabase.from('crm_pipeline_stages').insert({
      organization_id: organizationId,
      stage_scope: scope,
      slug: BUILDCORE_TERMINAL_PIPELINE_STAGE_SLUG,
      label: BUILDCORE_TERMINAL_PIPELINE_STAGE_LABEL,
      sort_order: nextSortOrder,
      is_active: true,
    });
    if (error != null) throw new Error(error.message);
    return ensureTerminalPipelineStageForOrg(supabase, organizationId, scope);
  }

  const maxSortOrder = stages.reduce((max, stage) => Math.max(max, stage.sortOrder), 0);
  if (terminal.sortOrder >= maxSortOrder) {
    return stages;
  }

  await normalizeOrganizationPipelineStageSortOrder(
    supabase,
    organizationId,
    scope,
    orderPipelineStageIdsWithTerminalLast(
      stages,
      stages
        .slice()
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((stage) => stage.id)
    )
  );

  return loadOrgPipelineStageRows(supabase, organizationId, scope);
}

export async function ensureOrganizationPipelineStagesForScope(
  supabase: SupabaseClient,
  organizationId: string,
  scope: PipelineStageScope
): Promise<OrgPipelineStageRecord[]> {
  const existing = await loadOrgPipelineStageRows(supabase, organizationId, scope);
  if (existing.length === 0) {
    if (scope === 'subproject') {
      const projectStages = await loadOrgPipelineStageRows(supabase, organizationId, 'project');
      if (projectStages.length > 0) {
        await copyProjectScopeStagesToSubprojectScope(supabase, organizationId);
        return ensureTerminalPipelineStageForOrg(supabase, organizationId, scope);
      }
    }
    return seedOrganizationPipelineStagesFromDefaults(supabase, organizationId, scope);
  }

  return ensureTerminalPipelineStageForOrg(supabase, organizationId, scope);
}

/** Ensures both project and subproject pipeline catalogs exist for the organization. */
export async function ensureOrganizationPipelineStages(
  supabase: SupabaseClient,
  organizationId: string
): Promise<void> {
  await ensureOrganizationPipelineStagesForScope(supabase, organizationId, 'project');
  await ensureOrganizationPipelineStagesForScope(supabase, organizationId, 'subproject');
}

export async function buildBuildCorePipelineStagesResponse(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
  scope: PipelineStageScope
): Promise<BuildCorePipelineStagesResponse> {
  const [stages, actorRole] = await Promise.all([
    ensureOrganizationPipelineStagesForScope(supabase, organizationId, scope),
    loadActiveOrganizationMemberRole(supabase, organizationId, userId),
  ]);

  return {
    scope,
    stages,
    catalog: orgPipelineStageRecordsToPipelineStages(stages),
    canManage: organizationRoleCanManagePipelineStages(actorRole),
  };
}

export async function buildBuildCorePipelineStagesBothScopesResponse(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string
): Promise<BuildCorePipelineStagesBothScopesResponse> {
  await ensureOrganizationPipelineStages(supabase, organizationId);
  const [project, subproject, actorRole] = await Promise.all([
    buildBuildCorePipelineStagesResponse(supabase, organizationId, userId, 'project'),
    buildBuildCorePipelineStagesResponse(supabase, organizationId, userId, 'subproject'),
    loadActiveOrganizationMemberRole(supabase, organizationId, userId),
  ]);

  return {
    project,
    subproject,
    canManage: organizationRoleCanManagePipelineStages(actorRole),
  };
}

export async function loadOrganizationPipelineStageCatalog(
  supabase: SupabaseClient,
  organizationId: string,
  scope: PipelineStageScope
): Promise<readonly PipelineStage[]> {
  const stages = await ensureOrganizationPipelineStagesForScope(supabase, organizationId, scope);
  return orgPipelineStageRecordsToPipelineStages(stages);
}

export async function loadOrganizationPipelineStageCatalogForProject(
  supabase: SupabaseClient,
  organizationId: string,
  project: { readonly parentProjectId: string | null }
): Promise<readonly PipelineStage[]> {
  const scope: PipelineStageScope =
    project.parentProjectId != null ? 'subproject' : 'project';
  return loadOrganizationPipelineStageCatalog(supabase, organizationId, scope);
}

async function loadOrganizationPipelineStageById(
  supabase: SupabaseClient,
  organizationId: string,
  stageId: string
): Promise<OrgPipelineStageRecord> {
  const { data, error } = await supabase
    .from('crm_pipeline_stages')
    .select(STAGE_SELECT)
    .eq('organization_id', organizationId)
    .eq('id', stageId)
    .eq('is_active', true)
    .maybeSingle();

  if (error != null) throw new Error(error.message);
  const mapped = data == null ? null : mapPipelineStageRow(data as DbPipelineStageRow);
  if (mapped == null) throw new Error('Workflow stage not found.');
  return mapped;
}

export async function createOrganizationPipelineStage(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
  label: string,
  scope: PipelineStageScope
): Promise<BuildCorePipelineStagesResponse> {
  const actorRole = await loadActiveOrganizationMemberRole(supabase, organizationId, userId);
  if (!organizationRoleCanManagePipelineStages(actorRole)) {
    throw new Error('You do not have permission to manage workflow stages.');
  }

  const trimmedLabel = label.trim();
  if (!trimmedLabel) {
    throw new Error('Stage name is required.');
  }

  const existing = await ensureOrganizationPipelineStagesForScope(supabase, organizationId, scope);
  const terminal = findTerminalPipelineStageRecord(existing);
  const takenSlugs = new Set(existing.map((stage) => stage.slug));
  let slug = ensureUniquePipelineStageSlug(slugifyPipelineStageLabel(trimmedLabel), takenSlugs);
  if (isReservedPipelineStageSlug(slug) || isInternalWorkflowStageSlug(slug)) {
    slug = ensureUniquePipelineStageSlug(`${slug}-stage`, takenSlugs);
  }

  const insertSortOrder =
    terminal?.sortOrder ?? existing.reduce((max, stage) => Math.max(max, stage.sortOrder), 0) + 1;

  if (terminal != null) {
    const { error: bumpError } = await supabase
      .from('crm_pipeline_stages')
      .update({ sort_order: insertSortOrder + 1 })
      .eq('organization_id', organizationId)
      .eq('stage_scope', scope)
      .eq('id', terminal.id);
    if (bumpError != null) throw new Error(bumpError.message);
  }

  const { error } = await supabase.from('crm_pipeline_stages').insert({
    organization_id: organizationId,
    stage_scope: scope,
    slug,
    label: trimmedLabel,
    sort_order: insertSortOrder,
    is_active: true,
  });
  if (error != null) throw new Error(error.message);

  return buildBuildCorePipelineStagesResponse(supabase, organizationId, userId, scope);
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

  const target = await loadOrganizationPipelineStageById(supabase, organizationId, stageId);

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

  return buildBuildCorePipelineStagesResponse(
    supabase,
    organizationId,
    userId,
    target.stageScope
  );
}

async function countPipelineStageUsage(
  supabase: SupabaseClient,
  organizationId: string,
  slug: string,
  scope: PipelineStageScope
): Promise<number> {
  let projectsCountQuery = supabase
    .from('crm_projects')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .eq('current_stage_slug', slug)
    .is('archived_at', null);

  if (scope === 'project') {
    projectsCountQuery = projectsCountQuery.is('parent_project_id', null);
  } else {
    projectsCountQuery = projectsCountQuery.not('parent_project_id', 'is', null);
  }

  const projectsResult = await projectsCountQuery;
  if (projectsResult.error != null) throw new Error(projectsResult.error.message);

  let scopedProjectsQuery = supabase
    .from('crm_projects')
    .select('id')
    .eq('organization_id', organizationId)
    .is('archived_at', null);

  if (scope === 'project') {
    scopedProjectsQuery = scopedProjectsQuery.is('parent_project_id', null);
  } else {
    scopedProjectsQuery = scopedProjectsQuery.not('parent_project_id', 'is', null);
  }

  const { data: scopedProjects, error: scopedProjectsError } = await scopedProjectsQuery;
  if (scopedProjectsError != null) throw new Error(scopedProjectsError.message);

  const projectIds = (scopedProjects ?? []).map((row) => row.id as string);
  if (projectIds.length === 0) {
    return projectsResult.count ?? 0;
  }

  const tasksResult = await supabase
    .from('crm_workflow_tasks')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .eq('stage_slug', slug)
    .in('project_id', projectIds)
    .is('amount_cents', null)
    .is('archived_at', null);

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

  const target = await loadOrganizationPipelineStageById(supabase, organizationId, stageId);
  const stages = await ensureOrganizationPipelineStagesForScope(
    supabase,
    organizationId,
    target.stageScope
  );

  if (isReservedPipelineStageSlug(target.slug)) {
    throw new Error('Complete is the terminal workflow stage and cannot be deleted.');
  }
  if (stages.length <= 1) {
    throw new Error('At least one workflow stage must remain.');
  }

  const usageCount = await countPipelineStageUsage(
    supabase,
    organizationId,
    target.slug,
    target.stageScope
  );
  if (usageCount > 0) {
    throw new Error('This stage is still used by projects or tasks and cannot be deleted.');
  }

  const { error } = await supabase
    .from('crm_pipeline_stages')
    .delete()
    .eq('organization_id', organizationId)
    .eq('id', stageId);

  if (error != null) throw new Error(error.message);

  const remaining = await loadOrgPipelineStageRows(
    supabase,
    organizationId,
    target.stageScope
  );
  await normalizeOrganizationPipelineStageSortOrder(
    supabase,
    organizationId,
    target.stageScope,
    orderPipelineStageIdsWithTerminalLast(
      remaining,
      remaining
        .slice()
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((stage) => stage.id)
    )
  );

  return buildBuildCorePipelineStagesResponse(
    supabase,
    organizationId,
    userId,
    target.stageScope
  );
}

async function normalizeOrganizationPipelineStageSortOrder(
  supabase: SupabaseClient,
  organizationId: string,
  scope: PipelineStageScope,
  orderedStageIds: readonly string[]
): Promise<void> {
  await Promise.all(
    orderedStageIds.map((stageId, index) =>
      supabase
        .from('crm_pipeline_stages')
        .update({ sort_order: index + 1 })
        .eq('organization_id', organizationId)
        .eq('stage_scope', scope)
        .eq('id', stageId)
    )
  );
}

export async function reorderOrganizationPipelineStages(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
  orderedStageIds: readonly string[],
  scope: PipelineStageScope
): Promise<BuildCorePipelineStagesResponse> {
  const actorRole = await loadActiveOrganizationMemberRole(supabase, organizationId, userId);
  if (!organizationRoleCanManagePipelineStages(actorRole)) {
    throw new Error('You do not have permission to manage workflow stages.');
  }

  const stages = await ensureOrganizationPipelineStagesForScope(supabase, organizationId, scope);
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
  await normalizeOrganizationPipelineStageSortOrder(
    supabase,
    organizationId,
    scope,
    normalizedOrder
  );
  return buildBuildCorePipelineStagesResponse(supabase, organizationId, userId, scope);
}

export function buildDefaultBuildCorePipelineStagesResponse(
  scope: PipelineStageScope = 'project'
): BuildCorePipelineStagesResponse {
  const stages = DEFAULT_PIPELINE_STAGES.map((stage, index) => ({
    id: `mock-stage-${scope}-${stage.slug}`,
    organizationId: 'mock-org',
    stageScope: scope,
    slug: stage.slug,
    label: stage.label,
    sortOrder: index + 1,
    isActive: true,
  }));

  return {
    scope,
    stages,
    catalog: DEFAULT_PIPELINE_STAGES,
    canManage: true,
  };
}

export function buildDefaultBuildCorePipelineStagesBothScopesResponse(): BuildCorePipelineStagesBothScopesResponse {
  return {
    project: buildDefaultBuildCorePipelineStagesResponse('project'),
    subproject: buildDefaultBuildCorePipelineStagesResponse('subproject'),
    canManage: true,
  };
}
