import type { SupabaseClient } from '@supabase/supabase-js';
import {
  buildDefaultBuildCoreFieldLabels,
  getBuildCoreFieldLabelRegistryEntry,
  isRegisteredBuildCoreFieldKey,
  REGISTERED_BUILDCORE_FIELD_KEYS,
  validateBuildCoreFieldLabelValue,
} from '@/domain/buildcore/fieldLabels';
import { organizationRoleCanManagePipelineStages } from '@/domain/buildcore/orgPipelineStages';
import { loadActiveOrganizationMemberRole } from './buildCoreWorkflowTaskVisibilityService';

type DbBuildCoreFieldLabelRow = {
  field_key: string;
  label: string;
};

export type BuildCoreFieldLabelsResponse = {
  readonly labels: Record<string, string>;
  readonly defaults: Record<string, string>;
  readonly canEdit: boolean;
};

function mapRowsToLabelOverrides(
  rows: readonly DbBuildCoreFieldLabelRow[]
): Record<string, string> {
  const labels: Record<string, string> = {};
  for (const row of rows) {
    if (!isRegisteredBuildCoreFieldKey(row.field_key)) continue;
    labels[row.field_key] = row.label.trim();
  }
  return labels;
}

export async function loadBuildCoreFieldLabelOverridesForOrg(
  supabase: SupabaseClient,
  organizationId: string
): Promise<Record<string, string>> {
  const { data, error } = await supabase
    .from('buildcore_field_labels')
    .select('field_key, label')
    .eq('organization_id', organizationId)
    .in('field_key', [...REGISTERED_BUILDCORE_FIELD_KEYS]);

  if (error != null) {
    throw new Error(`buildcore_field_labels_read_failed: ${error.message}`);
  }

  return mapRowsToLabelOverrides((data as DbBuildCoreFieldLabelRow[] | null) ?? []);
}

export async function upsertBuildCoreFieldLabelForOrg(
  supabase: SupabaseClient,
  organizationId: string,
  fieldKey: string,
  label: string
): Promise<Record<string, string>> {
  const entry = getBuildCoreFieldLabelRegistryEntry(fieldKey);
  if (entry == null) {
    throw new Error('Unknown field key.');
  }
  if (!entry.editable) {
    throw new Error('This field label cannot be edited.');
  }

  const validated = validateBuildCoreFieldLabelValue(label);
  if (!validated.ok) {
    throw new Error(validated.message);
  }

  const { error } = await supabase.from('buildcore_field_labels').upsert(
    {
      organization_id: organizationId,
      field_key: fieldKey,
      label: validated.value,
    },
    { onConflict: 'organization_id,field_key' }
  );

  if (error != null) {
    throw new Error(`buildcore_field_labels_write_failed: ${error.message}`);
  }

  return loadBuildCoreFieldLabelOverridesForOrg(supabase, organizationId);
}

export async function buildBuildCoreFieldLabelsResponse(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string
): Promise<BuildCoreFieldLabelsResponse> {
  const actorRole = await loadActiveOrganizationMemberRole(supabase, organizationId, userId);
  const labels = await loadBuildCoreFieldLabelOverridesForOrg(supabase, organizationId);
  return {
    labels,
    defaults: buildDefaultBuildCoreFieldLabels(),
    canEdit: organizationRoleCanManagePipelineStages(actorRole),
  };
}

export function buildDefaultBuildCoreFieldLabelsResponse(
  canEdit = true
): BuildCoreFieldLabelsResponse {
  return {
    labels: {},
    defaults: buildDefaultBuildCoreFieldLabels(),
    canEdit,
  };
}
