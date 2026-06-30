import type { SupabaseClient } from '@supabase/supabase-js';
import {
  isPaymentTableColumnPosition,
  resolvePaymentTableColumnSlots,
  type PaymentTableColumnPosition,
  type PaymentTableColumnSlots,
} from '@/domain/buildcore/paymentTableColumns';
import { organizationRoleCanManagePipelineStages } from '@/domain/buildcore/orgPipelineStages';
import { loadActiveOrganizationMemberRole } from './buildCoreWorkflowTaskVisibilityService';
import { listWorkflowTaskCustomFieldDefinitionsForOrg } from './buildCoreWorkflowTaskCustomFieldService';

type DbTableColumnRow = {
  position: number;
  field_key: string;
};

export type BuildCorePaymentTableColumnsResponse = {
  readonly slots: PaymentTableColumnSlots;
  readonly canManage: boolean;
};

async function assertActivePaymentCustomFieldKey(
  supabase: SupabaseClient,
  organizationId: string,
  fieldKey: string
): Promise<void> {
  const definitions = await listWorkflowTaskCustomFieldDefinitionsForOrg(supabase, organizationId, {
    scope: 'payment',
  });
  const match = definitions.find((def) => def.fieldKey === fieldKey);
  if (match == null) {
    throw new Error(`Unknown payment custom field: ${fieldKey}`);
  }
}

export async function listPaymentTableColumnsForOrg(
  supabase: SupabaseClient,
  organizationId: string
): Promise<PaymentTableColumnSlots> {
  const { data, error } = await supabase
    .from('buildcore_payment_table_columns')
    .select('position, field_key')
    .eq('organization_id', organizationId)
    .order('position', { ascending: true });

  if (error != null) {
    throw new Error(`buildcore_payment_table_columns_read_failed: ${error.message}`);
  }

  const rows = ((data as DbTableColumnRow[] | null) ?? []).map((row) => ({
    position: row.position,
    fieldKey: row.field_key,
  }));
  return resolvePaymentTableColumnSlots(rows);
}

export async function setPaymentTableColumnForOrg(
  supabase: SupabaseClient,
  organizationId: string,
  position: PaymentTableColumnPosition,
  fieldKey: string | null
): Promise<PaymentTableColumnSlots> {
  if (!isPaymentTableColumnPosition(position)) {
    throw new Error('Column position must be 1 or 2.');
  }

  if (fieldKey == null) {
    const { error } = await supabase
      .from('buildcore_payment_table_columns')
      .delete()
      .eq('organization_id', organizationId)
      .eq('position', position);
    if (error != null) {
      throw new Error(`buildcore_payment_table_columns_write_failed: ${error.message}`);
    }
    return listPaymentTableColumnsForOrg(supabase, organizationId);
  }

  const trimmed = fieldKey.trim();
  if (!trimmed) {
    throw new Error('fieldKey cannot be empty.');
  }

  await assertActivePaymentCustomFieldKey(supabase, organizationId, trimmed);

  const current = await listPaymentTableColumnsForOrg(supabase, organizationId);
  const otherPosition = position === 1 ? 2 : 1;
  const otherFieldKey = otherPosition === 1 ? current.slot1 : current.slot2;
  if (otherFieldKey === trimmed) {
    throw new Error('That custom field is already shown in another column.');
  }

  const { error } = await supabase.from('buildcore_payment_table_columns').upsert(
    {
      organization_id: organizationId,
      position,
      field_key: trimmed,
    },
    { onConflict: 'organization_id,position' }
  );

  if (error != null) {
    throw new Error(`buildcore_payment_table_columns_write_failed: ${error.message}`);
  }

  return listPaymentTableColumnsForOrg(supabase, organizationId);
}

export async function buildBuildCorePaymentTableColumnsResponse(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string
): Promise<BuildCorePaymentTableColumnsResponse> {
  const actorRole = await loadActiveOrganizationMemberRole(supabase, organizationId, userId);
  const slots = await listPaymentTableColumnsForOrg(supabase, organizationId);
  return {
    slots,
    canManage: organizationRoleCanManagePipelineStages(actorRole),
  };
}

export function buildDefaultBuildCorePaymentTableColumnsResponse(
  canManage = true
): BuildCorePaymentTableColumnsResponse {
  return {
    slots: { slot1: null, slot2: null },
    canManage,
  };
}
