import type { SupabaseClient } from '@supabase/supabase-js';
import {
  isWorkflowTaskTableColumnPosition,
  resolveWorkflowTaskTableColumnSlots,
  type WorkflowTaskTableColumnPosition,
  type WorkflowTaskTableColumnSlots,
} from '@/domain/buildcore/workflowTaskTableColumns';
import { organizationRoleCanManagePipelineStages } from '@/domain/buildcore/orgPipelineStages';
import { loadActiveOrganizationMemberRole } from './buildCoreWorkflowTaskVisibilityService';
import { listWorkflowTaskCustomFieldDefinitionsForOrg } from './buildCoreWorkflowTaskCustomFieldService';

type DbTableColumnRow = {
  position: number;
  field_key: string;
};

export type BuildCoreWorkflowTaskTableColumnsResponse = {
  readonly slots: WorkflowTaskTableColumnSlots;
  readonly canManage: boolean;
};

async function assertActiveWorkflowTaskCustomFieldKey(
  supabase: SupabaseClient,
  organizationId: string,
  fieldKey: string
): Promise<void> {
  const definitions = await listWorkflowTaskCustomFieldDefinitionsForOrg(supabase, organizationId, {
    scope: 'workflow_task',
  });
  const match = definitions.find((def) => def.fieldKey === fieldKey);
  if (match == null) {
    throw new Error(`Unknown workflow custom field: ${fieldKey}`);
  }
}

export async function listWorkflowTaskTableColumnsForOrg(
  supabase: SupabaseClient,
  organizationId: string
): Promise<WorkflowTaskTableColumnSlots> {
  const { data, error } = await supabase
    .from('buildcore_workflow_task_table_columns')
    .select('position, field_key')
    .eq('organization_id', organizationId)
    .order('position', { ascending: true });

  if (error != null) {
    throw new Error(`buildcore_wt_table_columns_read_failed: ${error.message}`);
  }

  const rows = ((data as DbTableColumnRow[] | null) ?? []).map((row) => ({
    position: row.position,
    fieldKey: row.field_key,
  }));
  return resolveWorkflowTaskTableColumnSlots(rows);
}

export async function setWorkflowTaskTableColumnForOrg(
  supabase: SupabaseClient,
  organizationId: string,
  position: WorkflowTaskTableColumnPosition,
  fieldKey: string | null
): Promise<WorkflowTaskTableColumnSlots> {
  if (!isWorkflowTaskTableColumnPosition(position)) {
    throw new Error('Column position must be 1 or 2.');
  }

  if (fieldKey == null) {
    const { error } = await supabase
      .from('buildcore_workflow_task_table_columns')
      .delete()
      .eq('organization_id', organizationId)
      .eq('position', position);
    if (error != null) {
      throw new Error(`buildcore_wt_table_columns_write_failed: ${error.message}`);
    }
    return listWorkflowTaskTableColumnsForOrg(supabase, organizationId);
  }

  const trimmed = fieldKey.trim();
  if (!trimmed) {
    throw new Error('fieldKey cannot be empty.');
  }

  await assertActiveWorkflowTaskCustomFieldKey(supabase, organizationId, trimmed);

  const current = await listWorkflowTaskTableColumnsForOrg(supabase, organizationId);
  const otherPosition = position === 1 ? 2 : 1;
  const otherFieldKey = otherPosition === 1 ? current.slot1 : current.slot2;
  if (otherFieldKey === trimmed) {
    throw new Error('That custom field is already shown in another column.');
  }

  const { error } = await supabase.from('buildcore_workflow_task_table_columns').upsert(
    {
      organization_id: organizationId,
      position,
      field_key: trimmed,
    },
    { onConflict: 'organization_id,position' }
  );

  if (error != null) {
    throw new Error(`buildcore_wt_table_columns_write_failed: ${error.message}`);
  }

  return listWorkflowTaskTableColumnsForOrg(supabase, organizationId);
}

export async function buildBuildCoreWorkflowTaskTableColumnsResponse(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string
): Promise<BuildCoreWorkflowTaskTableColumnsResponse> {
  const actorRole = await loadActiveOrganizationMemberRole(supabase, organizationId, userId);
  const slots = await listWorkflowTaskTableColumnsForOrg(supabase, organizationId);
  return {
    slots,
    canManage: organizationRoleCanManagePipelineStages(actorRole),
  };
}

export function buildDefaultBuildCoreWorkflowTaskTableColumnsResponse(
  canManage = true
): BuildCoreWorkflowTaskTableColumnsResponse {
  return {
    slots: { slot1: null, slot2: null },
    canManage,
  };
}
