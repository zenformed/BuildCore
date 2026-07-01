import type { SupabaseClient } from '@supabase/supabase-js';
import type { CrmProjectSummary } from '@/domain/crm';
import type {
  ProjectCustomFieldDefinition,
  ProjectCustomFieldScope,
  ProjectCustomFieldSource,
  ProjectCustomFieldType,
  ProjectCustomFieldsMap,
  ProjectCustomFieldValuesInput,
} from '@/domain/buildcore/projectCustomFields';
import {
  normalizeProjectCustomFieldTextValue,
  resolveProjectCustomFieldScopeForProject,
  slugifyProjectCustomFieldKey,
  sortProjectCustomFieldDefinitions,
  validateProjectCustomFieldLabel,
} from '@/domain/buildcore/projectCustomFields';
import { organizationRoleCanManagePipelineStages } from '@/domain/buildcore/orgPipelineStages';
import { loadActiveOrganizationMemberRole } from './buildCoreWorkflowTaskVisibilityService';

type DbCustomFieldDefinitionRow = {
  id: string;
  field_key: string;
  label: string;
  field_type: string;
  scope: string;
  display_order: number;
  is_archived: boolean;
  source: string;
};

type DbCustomFieldValueRow = {
  project_id: string;
  field_definition_id: string;
  value_text: string | null;
  buildcore_project_custom_field_definitions: {
    field_key: string;
    scope: string;
    is_archived: boolean;
    field_type: string;
  } | null;
};

export type ProjectCustomFieldLoadProjectRef = {
  readonly id: string;
  readonly parentProjectId: string | null;
};

export type BuildCoreProjectCustomFieldsResponse = {
  readonly definitions: readonly ProjectCustomFieldDefinition[];
  readonly canManage: boolean;
};

function mapDefinitionRow(row: DbCustomFieldDefinitionRow): ProjectCustomFieldDefinition {
  return {
    id: row.id,
    fieldKey: row.field_key,
    label: row.label.trim(),
    fieldType: row.field_type as ProjectCustomFieldType,
    scope: row.scope as ProjectCustomFieldScope,
    displayOrder: row.display_order,
    isArchived: row.is_archived,
    source: row.source as ProjectCustomFieldSource,
  };
}

export function buildProjectCustomFieldLoadProjectRef(
  summary: Pick<CrmProjectSummary, 'id' | 'parentProjectId'>
): ProjectCustomFieldLoadProjectRef {
  return {
    id: summary.id,
    parentProjectId: summary.parentProjectId,
  };
}

export async function listProjectCustomFieldDefinitionsForOrg(
  supabase: SupabaseClient,
  organizationId: string,
  options?: { includeArchived?: boolean; scope?: ProjectCustomFieldScope }
): Promise<readonly ProjectCustomFieldDefinition[]> {
  let query = supabase
    .from('buildcore_project_custom_field_definitions')
    .select('id, field_key, label, field_type, scope, display_order, is_archived, source')
    .eq('organization_id', organizationId)
    .order('display_order', { ascending: true })
    .order('label', { ascending: true });

  if (options?.scope != null) {
    query = query.eq('scope', options.scope);
  }

  if (!options?.includeArchived) {
    query = query.eq('is_archived', false);
  }

  const { data, error } = await query;
  if (error != null) {
    throw new Error(`buildcore_project_custom_field_defs_read_failed: ${error.message}`);
  }

  return sortProjectCustomFieldDefinitions(
    ((data as DbCustomFieldDefinitionRow[] | null) ?? []).map(mapDefinitionRow)
  );
}

async function resolveUniqueFieldKey(
  supabase: SupabaseClient,
  organizationId: string,
  scope: ProjectCustomFieldScope,
  baseKey: string
): Promise<string> {
  const { data, error } = await supabase
    .from('buildcore_project_custom_field_definitions')
    .select('field_key')
    .eq('organization_id', organizationId)
    .eq('scope', scope)
    .like('field_key', `${baseKey}%`);

  if (error != null) {
    throw new Error(`buildcore_project_custom_field_defs_read_failed: ${error.message}`);
  }

  const existing = new Set(
    ((data as { field_key: string }[] | null) ?? []).map((row) => row.field_key)
  );
  if (!existing.has(baseKey)) return baseKey;

  let suffix = 2;
  while (existing.has(`${baseKey}_${suffix}`)) {
    suffix += 1;
  }
  return `${baseKey}_${suffix}`;
}

export async function createProjectCustomFieldDefinitionForOrg(
  supabase: SupabaseClient,
  organizationId: string,
  input: {
    label: string;
    scope: ProjectCustomFieldScope;
    fieldType?: ProjectCustomFieldType;
    source?: ProjectCustomFieldSource;
  }
): Promise<ProjectCustomFieldDefinition> {
  const validated = validateProjectCustomFieldLabel(input.label);
  if (!validated.ok) {
    throw new Error(validated.message);
  }

  const fieldType = input.fieldType ?? 'text';
  if (fieldType !== 'text') {
    throw new Error('Only text custom fields are supported in this release.');
  }

  const baseKey = slugifyProjectCustomFieldKey(validated.value);
  const fieldKey = await resolveUniqueFieldKey(supabase, organizationId, input.scope, baseKey);

  const { data: maxOrderRow } = await supabase
    .from('buildcore_project_custom_field_definitions')
    .select('display_order')
    .eq('organization_id', organizationId)
    .eq('scope', input.scope)
    .order('display_order', { ascending: false })
    .limit(1)
    .maybeSingle();

  const displayOrder = (maxOrderRow?.display_order ?? 0) + 1;

  const { data, error } = await supabase
    .from('buildcore_project_custom_field_definitions')
    .insert({
      organization_id: organizationId,
      field_key: fieldKey,
      label: validated.value,
      field_type: fieldType,
      scope: input.scope,
      display_order: displayOrder,
      source: input.source ?? 'user',
    })
    .select('id, field_key, label, field_type, scope, display_order, is_archived, source')
    .single();

  if (error != null || data == null) {
    throw new Error(`buildcore_project_custom_field_defs_write_failed: ${error?.message ?? 'unknown'}`);
  }

  return mapDefinitionRow(data as DbCustomFieldDefinitionRow);
}

export async function updateProjectCustomFieldDefinitionForOrg(
  supabase: SupabaseClient,
  organizationId: string,
  scope: ProjectCustomFieldScope,
  fieldKey: string,
  patch: { label?: string; isArchived?: boolean }
): Promise<ProjectCustomFieldDefinition> {
  const update: Record<string, unknown> = {};
  if (patch.label !== undefined) {
    const validated = validateProjectCustomFieldLabel(patch.label);
    if (!validated.ok) throw new Error(validated.message);
    update.label = validated.value;
  }
  if (patch.isArchived !== undefined) {
    update.is_archived = patch.isArchived;
  }
  if (Object.keys(update).length === 0) {
    throw new Error('No fields to update.');
  }

  const { data, error } = await supabase
    .from('buildcore_project_custom_field_definitions')
    .update(update)
    .eq('organization_id', organizationId)
    .eq('scope', scope)
    .eq('field_key', fieldKey)
    .select('id, field_key, label, field_type, scope, display_order, is_archived, source')
    .maybeSingle();

  if (error != null) {
    throw new Error(`buildcore_project_custom_field_defs_write_failed: ${error.message}`);
  }
  if (data == null) {
    throw new Error('Custom field not found.');
  }

  return mapDefinitionRow(data as DbCustomFieldDefinitionRow);
}

export async function loadProjectCustomFieldsMapForProjectIds(
  supabase: SupabaseClient,
  organizationId: string,
  projects: readonly ProjectCustomFieldLoadProjectRef[]
): Promise<ReadonlyMap<string, ProjectCustomFieldsMap>> {
  const map = new Map<string, ProjectCustomFieldsMap>();
  if (projects.length === 0) return map;

  const scopeByProjectId = new Map(
    projects.map((project) => [
      project.id,
      resolveProjectCustomFieldScopeForProject({ parentProjectId: project.parentProjectId }),
    ] as const)
  );

  for (const project of projects) {
    map.set(project.id, {});
  }

  const projectIds = projects.map((project) => project.id);
  const { data, error } = await supabase
    .from('buildcore_project_custom_field_values')
    .select(
      'project_id, field_definition_id, value_text, buildcore_project_custom_field_definitions ( field_key, scope, is_archived, field_type )'
    )
    .eq('organization_id', organizationId)
    .in('project_id', projectIds);

  if (error != null) {
    throw new Error(`buildcore_project_custom_field_values_read_failed: ${error.message}`);
  }

  const rows = (data as unknown as DbCustomFieldValueRow[] | null) ?? [];
  for (const row of rows) {
    const scope = scopeByProjectId.get(row.project_id);
    if (scope == null) continue;
    const existing = map.get(row.project_id) ?? {};
    const definition = row.buildcore_project_custom_field_definitions;
    const fieldKey = definition?.field_key;
    if (!fieldKey || definition?.is_archived || definition.scope !== scope) continue;
    map.set(row.project_id, {
      ...existing,
      [fieldKey]: normalizeProjectCustomFieldTextValue(row.value_text),
    });
  }
  return map;
}

export function attachCustomFieldsToProjectSummary(
  summary: CrmProjectSummary,
  customFields: ProjectCustomFieldsMap
): CrmProjectSummary {
  return { ...summary, customFields };
}

export function attachCustomFieldsToProjectSummaries(
  summaries: readonly CrmProjectSummary[],
  valuesByProjectId: ReadonlyMap<string, ProjectCustomFieldsMap>
): CrmProjectSummary[] {
  return summaries.map((summary) => ({
    ...summary,
    customFields: valuesByProjectId.get(summary.id) ?? {},
  }));
}

export async function upsertProjectCustomFieldValuesForProject(
  supabase: SupabaseClient,
  organizationId: string,
  project: ProjectCustomFieldLoadProjectRef,
  values: ProjectCustomFieldValuesInput
): Promise<ProjectCustomFieldsMap> {
  const scope = resolveProjectCustomFieldScopeForProject({
    parentProjectId: project.parentProjectId,
  });
  const projectId = project.id;
  const definitions = await listProjectCustomFieldDefinitionsForOrg(supabase, organizationId, {
    scope,
  });
  const definitionByKey = new Map(definitions.map((def) => [def.fieldKey, def] as const));

  const keysToWrite = Object.keys(values);
  if (keysToWrite.length === 0) {
    const existing = await loadProjectCustomFieldsMapForProjectIds(supabase, organizationId, [project]);
    return existing.get(projectId) ?? {};
  }

  for (const fieldKey of keysToWrite) {
    const definition = definitionByKey.get(fieldKey);
    if (definition == null) {
      throw new Error(`Unknown custom field for ${scope}: ${fieldKey}`);
    }
    if (definition.fieldType !== 'text') {
      throw new Error(`Unsupported custom field type: ${definition.fieldType}`);
    }
  }

  const { data: existingRows, error: existingError } = await supabase
    .from('buildcore_project_custom_field_values')
    .select(
      'id, field_definition_id, buildcore_project_custom_field_definitions ( field_key, scope )'
    )
    .eq('organization_id', organizationId)
    .eq('project_id', projectId);

  if (existingError != null) {
    throw new Error(`buildcore_project_custom_field_values_read_failed: ${existingError.message}`);
  }

  const existingByFieldKey = new Map<string, string>();
  for (const row of (existingRows as unknown as {
    id: string;
    field_definition_id: string;
    buildcore_project_custom_field_definitions: { field_key: string; scope: string } | null;
  }[]) ?? []) {
    const definition = row.buildcore_project_custom_field_definitions;
    if (definition?.scope === scope && definition.field_key) {
      existingByFieldKey.set(definition.field_key, row.id);
    }
  }

  for (const fieldKey of keysToWrite) {
    const definition = definitionByKey.get(fieldKey)!;
    const normalized = normalizeProjectCustomFieldTextValue(values[fieldKey]);
    const existingId = existingByFieldKey.get(fieldKey);

    if (normalized == null) {
      if (existingId != null) {
        const { error: deleteError } = await supabase
          .from('buildcore_project_custom_field_values')
          .delete()
          .eq('id', existingId);
        if (deleteError != null) {
          throw new Error(
            `buildcore_project_custom_field_values_write_failed: ${deleteError.message}`
          );
        }
      }
      continue;
    }

    if (existingId != null) {
      const { error: updateError } = await supabase
        .from('buildcore_project_custom_field_values')
        .update({ value_text: normalized })
        .eq('id', existingId);
      if (updateError != null) {
        throw new Error(
          `buildcore_project_custom_field_values_write_failed: ${updateError.message}`
        );
      }
    } else {
      const { error: insertError } = await supabase
        .from('buildcore_project_custom_field_values')
        .insert({
          organization_id: organizationId,
          project_id: projectId,
          field_definition_id: definition.id,
          value_text: normalized,
        });
      if (insertError != null) {
        throw new Error(
          `buildcore_project_custom_field_values_write_failed: ${insertError.message}`
        );
      }
    }
  }

  const refreshed = await loadProjectCustomFieldsMapForProjectIds(supabase, organizationId, [project]);
  return refreshed.get(projectId) ?? {};
}

export async function buildBuildCoreProjectCustomFieldsResponse(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
  scope?: ProjectCustomFieldScope
): Promise<BuildCoreProjectCustomFieldsResponse> {
  const actorRole = await loadActiveOrganizationMemberRole(supabase, organizationId, userId);
  const definitions = await listProjectCustomFieldDefinitionsForOrg(supabase, organizationId, {
    includeArchived: true,
    scope,
  });
  return {
    definitions,
    canManage: organizationRoleCanManagePipelineStages(actorRole),
  };
}

export function buildDefaultBuildCoreProjectCustomFieldsResponse(
  canManage = true
): BuildCoreProjectCustomFieldsResponse {
  return { definitions: [], canManage };
}
