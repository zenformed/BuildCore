import type { SupabaseClient } from '@supabase/supabase-js';
import {
  extractIdentityValues,
  type CrmIdentityCustomFieldValue,
  type CrmIdentityRecordSnapshot,
  type CrmIdentityRecordType,
  type CrmIdentityValueDraft,
} from '@/domain/crm/identity';

type DbProjectIdentityRow = {
  id: string;
  organization_id: string;
  parent_project_id: string | null;
  name: string;
  address_line_1: string | null;
  address_line_2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  primary_contact_id: string | null;
  crm_contacts: {
    full_name: string;
    email: string | null;
    phone: string | null;
    contact_emails: string[] | null;
    contact_phones: string[] | null;
  } | null;
};

type DbCustomFieldValueRow = {
  id: string;
  project_id: string;
  value_text: string | null;
  buildcore_project_custom_field_definitions: {
    id: string;
    field_key: string;
    label: string;
    is_archived: boolean;
  } | null;
};

function resolveRecordType(parentProjectId: string | null): CrmIdentityRecordType {
  return parentProjectId == null ? 'project' : 'subproject';
}

function emailsFromContact(
  contact: DbProjectIdentityRow['crm_contacts']
): readonly string[] {
  if (contact == null) return [];
  const fromArray = (contact.contact_emails ?? []).filter((value) => value.trim().length > 0);
  if (fromArray.length > 0) return fromArray;
  if (contact.email != null && contact.email.trim() !== '') return [contact.email];
  return [];
}

function phonesFromContact(
  contact: DbProjectIdentityRow['crm_contacts']
): readonly string[] {
  if (contact == null) return [];
  const fromArray = (contact.contact_phones ?? []).filter((value) => value.trim().length > 0);
  if (fromArray.length > 0) return fromArray;
  if (contact.phone != null && contact.phone.trim() !== '') return [contact.phone];
  return [];
}

export async function loadCrmIdentityRecordSnapshot(
  supabase: SupabaseClient,
  organizationId: string,
  recordId: string
): Promise<CrmIdentityRecordSnapshot | null> {
  const { data: projectRow, error: projectError } = await supabase
    .from('crm_projects')
    .select(
      `
      id,
      organization_id,
      parent_project_id,
      name,
      address_line_1,
      address_line_2,
      city,
      state,
      postal_code,
      primary_contact_id,
      crm_contacts:primary_contact_id (
        full_name,
        email,
        phone,
        contact_emails,
        contact_phones
      )
    `
    )
    .eq('organization_id', organizationId)
    .eq('id', recordId)
    .maybeSingle();

  if (projectError) {
    throw new Error(`crm_record_identity_load_project_failed: ${projectError.message}`);
  }
  if (projectRow == null) return null;

  const project = projectRow as unknown as DbProjectIdentityRow;

  const { data: cfRows, error: cfError } = await supabase
    .from('buildcore_project_custom_field_values')
    .select(
      `
      id,
      project_id,
      value_text,
      buildcore_project_custom_field_definitions (
        id,
        field_key,
        label,
        is_archived
      )
    `
    )
    .eq('organization_id', organizationId)
    .eq('project_id', recordId);

  if (cfError) {
    throw new Error(`crm_record_identity_load_custom_fields_failed: ${cfError.message}`);
  }

  const customFields: CrmIdentityCustomFieldValue[] = [];
  for (const row of (cfRows as unknown as DbCustomFieldValueRow[] | null) ?? []) {
    const definition = row.buildcore_project_custom_field_definitions;
    if (definition == null || definition.is_archived) continue;
    customFields.push({
      definitionId: definition.id,
      valueId: row.id,
      fieldKey: definition.field_key,
      label: definition.label,
      valueText: row.value_text,
    });
  }

  const contact = project.crm_contacts;

  return {
    organizationId: project.organization_id,
    recordId: project.id,
    recordType: resolveRecordType(project.parent_project_id),
    projectName: project.name,
    contactName: contact?.full_name ?? null,
    emails: emailsFromContact(contact),
    phones: phonesFromContact(contact),
    address: {
      addressLine1: project.address_line_1,
      addressLine2: project.address_line_2,
      city: project.city,
      state: project.state,
      postalCode: project.postal_code,
    },
    customFields,
  };
}

function toInsertRows(
  organizationId: string,
  recordId: string,
  recordType: CrmIdentityRecordType,
  drafts: readonly CrmIdentityValueDraft[]
): readonly Record<string, unknown>[] {
  return drafts.map((draft) => ({
    organization_id: organizationId,
    record_id: recordId,
    record_type: recordType,
    value_type: draft.valueType,
    normalized_value: draft.normalizedValue,
    source_kind: draft.sourceKind,
    source_field_key: draft.sourceFieldKey,
    source_field_label: draft.sourceFieldLabel,
    source_value_id: draft.sourceValueId,
  }));
}

/**
 * Delete existing identity rows for a record and insert freshly extracted values.
 * Uses the same extractIdentityValues path as backfill and future candidate checks.
 */
export async function reindexCrmRecordIdentityValues(
  supabase: SupabaseClient,
  organizationId: string,
  recordId: string
): Promise<{ readonly insertedCount: number }> {
  const snapshot = await loadCrmIdentityRecordSnapshot(supabase, organizationId, recordId);
  if (snapshot == null) {
    const { error: deleteMissingError } = await supabase
      .from('crm_record_identity_values')
      .delete()
      .eq('organization_id', organizationId)
      .eq('record_id', recordId);
    if (deleteMissingError) {
      throw new Error(
        `crm_record_identity_delete_missing_failed: ${deleteMissingError.message}`
      );
    }
    return { insertedCount: 0 };
  }

  const drafts = extractIdentityValues(snapshot);

  const { error: deleteError } = await supabase
    .from('crm_record_identity_values')
    .delete()
    .eq('organization_id', organizationId)
    .eq('record_id', recordId);

  if (deleteError) {
    throw new Error(`crm_record_identity_delete_failed: ${deleteError.message}`);
  }

  if (drafts.length === 0) {
    return { insertedCount: 0 };
  }

  const rows = toInsertRows(
    organizationId,
    snapshot.recordId,
    snapshot.recordType,
    drafts
  );
  const { error: insertError } = await supabase.from('crm_record_identity_values').insert(rows);
  if (insertError) {
    throw new Error(`crm_record_identity_insert_failed: ${insertError.message}`);
  }

  return { insertedCount: drafts.length };
}

/**
 * Reindex every project/subproject that currently uses this contact as primary.
 * Used when lead capture updates an existing shared contact.
 */
export async function reindexCrmRecordsForPrimaryContact(
  supabase: SupabaseClient,
  organizationId: string,
  contactId: string
): Promise<{ readonly reindexedCount: number; readonly failedCount: number }> {
  const { data, error } = await supabase
    .from('crm_projects')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('primary_contact_id', contactId);

  if (error) {
    throw new Error(`crm_record_identity_contact_projects_failed: ${error.message}`);
  }

  let reindexedCount = 0;
  let failedCount = 0;
  for (const row of data ?? []) {
    try {
      await reindexCrmRecordIdentityValues(supabase, organizationId, row.id as string);
      reindexedCount += 1;
    } catch {
      failedCount += 1;
    }
  }
  return { reindexedCount, failedCount };
}

/** Best-effort reindex that never fails the primary write path. */
export async function tryReindexCrmRecordIdentityValues(
  supabase: SupabaseClient,
  organizationId: string,
  recordId: string
): Promise<void> {
  try {
    await reindexCrmRecordIdentityValues(supabase, organizationId, recordId);
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error(
      `[crm_record_identity] reindex failed org=${organizationId} record=${recordId}: ${detail}`
    );
  }
}
