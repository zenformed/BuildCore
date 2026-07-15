import type { SupabaseClient } from '@supabase/supabase-js';
import {
  BUILDCORE_ENTITY_TERMINOLOGY_KEYS,
  buildDefaultEntityTerminologyOverrides,
  isBuildCoreEntityTerminologyKey,
  resolveEntityTerminology,
  validateEntityTerminologyDisplayName,
  type BuildCoreEntityTerminologyKey,
  type ResolvedEntityTerminology,
} from '@/domain/buildcore/entityTerminology';
import { organizationRoleCanManagePipelineStages } from '@/domain/buildcore/orgPipelineStages';
import { loadActiveOrganizationMemberRole } from './buildCoreWorkflowTaskVisibilityService';

type DbEntityTerminologyRow = {
  entity_key: string;
  display_name: string;
};

export type BuildCoreEntityTerminologyResponse = {
  readonly terms: ResolvedEntityTerminology;
  readonly overrides: Readonly<Partial<Record<BuildCoreEntityTerminologyKey, string>>>;
  readonly defaults: Readonly<Record<BuildCoreEntityTerminologyKey, string>>;
  readonly canEdit: boolean;
};

function mapRowsToOverrides(
  rows: readonly DbEntityTerminologyRow[]
): Partial<Record<BuildCoreEntityTerminologyKey, string>> {
  const overrides: Partial<Record<BuildCoreEntityTerminologyKey, string>> = {};
  for (const row of rows) {
    if (!isBuildCoreEntityTerminologyKey(row.entity_key)) continue;
    const trimmed = row.display_name.trim();
    if (!trimmed) continue;
    overrides[row.entity_key] = trimmed;
  }
  return overrides;
}

export async function loadBuildCoreEntityTerminologyOverridesForOrg(
  supabase: SupabaseClient,
  organizationId: string
): Promise<Partial<Record<BuildCoreEntityTerminologyKey, string>>> {
  const { data, error } = await supabase
    .from('buildcore_entity_terminology')
    .select('entity_key, display_name')
    .eq('organization_id', organizationId)
    .in('entity_key', [...BUILDCORE_ENTITY_TERMINOLOGY_KEYS]);

  if (error != null) {
    throw new Error(`buildcore_entity_terminology_read_failed: ${error.message}`);
  }

  return mapRowsToOverrides((data as DbEntityTerminologyRow[] | null) ?? []);
}

export async function upsertBuildCoreEntityTerminologyForOrg(
  supabase: SupabaseClient,
  organizationId: string,
  entityKey: string,
  displayName: string
): Promise<Partial<Record<BuildCoreEntityTerminologyKey, string>>> {
  if (!isBuildCoreEntityTerminologyKey(entityKey)) {
    throw new Error('Unknown entity key.');
  }

  const validated = validateEntityTerminologyDisplayName(displayName);
  if (!validated.ok) {
    throw new Error(validated.message);
  }

  const { error } = await supabase.from('buildcore_entity_terminology').upsert(
    {
      organization_id: organizationId,
      entity_key: entityKey,
      display_name: validated.value,
    },
    { onConflict: 'organization_id,entity_key' }
  );

  if (error != null) {
    throw new Error(`buildcore_entity_terminology_write_failed: ${error.message}`);
  }

  return loadBuildCoreEntityTerminologyOverridesForOrg(supabase, organizationId);
}

export async function buildBuildCoreEntityTerminologyResponse(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string
): Promise<BuildCoreEntityTerminologyResponse> {
  const actorRole = await loadActiveOrganizationMemberRole(supabase, organizationId, userId);
  const overrides = await loadBuildCoreEntityTerminologyOverridesForOrg(
    supabase,
    organizationId
  );
  return {
    terms: resolveEntityTerminology(overrides),
    overrides,
    defaults: buildDefaultEntityTerminologyOverrides(),
    canEdit: organizationRoleCanManagePipelineStages(actorRole),
  };
}

export function buildDefaultBuildCoreEntityTerminologyResponse(
  canEdit = true
): BuildCoreEntityTerminologyResponse {
  return {
    terms: resolveEntityTerminology(),
    overrides: {},
    defaults: buildDefaultEntityTerminologyOverrides(),
    canEdit,
  };
}
