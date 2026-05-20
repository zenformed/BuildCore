import type { SupabaseClient } from '@supabase/supabase-js';
import type { CrmBudgetEntry } from '@/domain/crm';
import type {
  CreateCrmBudgetEntryInput,
  UpdateCrmBudgetEntryInput,
} from '@/domain/crm/budgetMutations';
import {
  mapDbBudgetEntry,
  type DbCrmBudgetEntryRow,
} from '@/infrastructure/crm/mappers/mapCrmFromDb';
import { appendCrmAccountabilityEvent } from './crmAccountability';
import { loadCrmMemberMap } from './crmMemberMap';
import { resolveCrmProjectIdBySlug } from './resolveCrmProjectIdBySlug';

const BUDGET_SELECT =
  'id, project_id, item_name, category, cost_cents, budget_cents, notes, assigned_to, occurred_on, documents_required, created_at, updated_at, created_by';

async function mapBudgetRow(
  supabase: SupabaseClient,
  row: DbCrmBudgetEntryRow
): Promise<CrmBudgetEntry> {
  const ids = [row.assigned_to, row.created_by].filter((id): id is string => id != null);
  const memberById = await loadCrmMemberMap(supabase, ids);
  return mapDbBudgetEntry(row, memberById, 0);
}

async function getBudgetEntryForOrg(
  supabase: SupabaseClient,
  organizationId: string,
  entryId: string
): Promise<DbCrmBudgetEntryRow | null> {
  const { data, error } = await supabase
    .from('crm_project_budget_entries')
    .select(BUDGET_SELECT)
    .eq('id', entryId)
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as DbCrmBudgetEntryRow | null) ?? null;
}

export async function listCrmBudgetEntriesForOrg(
  supabase: SupabaseClient,
  organizationId: string,
  projectSlug: string
): Promise<readonly CrmBudgetEntry[]> {
  const projectId = await resolveCrmProjectIdBySlug(supabase, organizationId, projectSlug);
  if (!projectId) return [];

  const [entriesResult, documentsResult] = await Promise.all([
    supabase
      .from('crm_project_budget_entries')
      .select(BUDGET_SELECT)
      .eq('project_id', projectId)
      .eq('organization_id', organizationId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true }),
    supabase
      .from('crm_documents')
      .select('budget_entry_id')
      .eq('project_id', projectId)
      .is('deleted_at', null)
      .eq('upload_status', 'ready')
      .not('budget_entry_id', 'is', null),
  ]);

  if (entriesResult.error) throw new Error(entriesResult.error.message);
  if (documentsResult.error) throw new Error(documentsResult.error.message);

  const rows = (entriesResult.data ?? []) as DbCrmBudgetEntryRow[];
  const docCountByEntry = new Map<string, number>();
  for (const doc of documentsResult.data ?? []) {
    const entryId = doc.budget_entry_id as string | null;
    if (entryId == null) continue;
    docCountByEntry.set(entryId, (docCountByEntry.get(entryId) ?? 0) + 1);
  }

  const memberIds = rows.flatMap((row) =>
    [row.assigned_to, row.created_by].filter((id): id is string => id != null)
  );
  const memberById = await loadCrmMemberMap(supabase, memberIds);
  return rows.map((row) =>
    mapDbBudgetEntry(row, memberById, docCountByEntry.get(row.id) ?? 0)
  );
}

export async function createCrmBudgetEntryForOrg(
  supabase: SupabaseClient,
  organizationId: string,
  actorUserId: string,
  input: CreateCrmBudgetEntryInput
): Promise<CrmBudgetEntry> {
  const { data, error } = await supabase
    .from('crm_project_budget_entries')
    .insert({
      organization_id: organizationId,
      project_id: input.projectId,
      item_name: input.itemName,
      category: input.category,
      cost_cents: input.costCents,
      budget_cents: input.budgetCents,
      notes: input.notes ?? null,
      assigned_to: input.assignedMemberId ?? null,
      occurred_on: input.occurredOn ?? null,
      documents_required: input.documentsRequired ?? true,
      created_by: actorUserId,
    })
    .select(BUDGET_SELECT)
    .single();

  if (error || !data) throw new Error(error?.message ?? 'Failed to create budget entry');

  await appendCrmAccountabilityEvent(supabase, {
    organizationId,
    projectId: input.projectId,
    actorMemberId: actorUserId,
    eventType: 'budget_entry_created',
    summary: `Added budget item: ${input.itemName}`,
    metadata: { category: input.category, cost_cents: input.costCents, budget_cents: input.budgetCents },
  });

  return mapBudgetRow(supabase, data as DbCrmBudgetEntryRow);
}

export async function updateCrmBudgetEntryForOrg(
  supabase: SupabaseClient,
  organizationId: string,
  actorUserId: string,
  input: UpdateCrmBudgetEntryInput
): Promise<CrmBudgetEntry | null> {
  const existing = await getBudgetEntryForOrg(supabase, organizationId, input.entryId);
  if (!existing) return null;

  const patch: Record<string, unknown> = {};
  if (input.itemName !== undefined) patch.item_name = input.itemName;
  if (input.category !== undefined) patch.category = input.category;
  if (input.costCents !== undefined) patch.cost_cents = input.costCents;
  if (input.budgetCents !== undefined) patch.budget_cents = input.budgetCents;
  if (input.notes !== undefined) patch.notes = input.notes;
  if (input.assignedMemberId !== undefined) patch.assigned_to = input.assignedMemberId;
  if (input.occurredOn !== undefined) patch.occurred_on = input.occurredOn;
  if (input.documentsRequired !== undefined) patch.documents_required = input.documentsRequired;

  const { data, error } = await supabase
    .from('crm_project_budget_entries')
    .update(patch)
    .eq('id', input.entryId)
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .select(BUDGET_SELECT)
    .single();

  if (error) throw new Error(error.message);
  if (!data) return null;

  await appendCrmAccountabilityEvent(supabase, {
    organizationId,
    projectId: existing.project_id,
    actorMemberId: actorUserId,
    eventType: 'budget_entry_updated',
    summary: `Updated budget item: ${(data as DbCrmBudgetEntryRow).item_name}`,
    metadata: { budget_entry_id: input.entryId },
  });

  return mapBudgetRow(supabase, data as DbCrmBudgetEntryRow);
}

export async function deleteCrmBudgetEntryForOrg(
  supabase: SupabaseClient,
  organizationId: string,
  actorUserId: string,
  entryId: string
): Promise<boolean> {
  const existing = await getBudgetEntryForOrg(supabase, organizationId, entryId);
  if (!existing) return false;

  const { error } = await supabase
    .from('crm_project_budget_entries')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', entryId)
    .eq('organization_id', organizationId)
    .is('deleted_at', null);

  if (error) throw new Error(error.message);

  await appendCrmAccountabilityEvent(supabase, {
    organizationId,
    projectId: existing.project_id,
    actorMemberId: actorUserId,
    eventType: 'budget_entry_deleted',
    summary: `Removed budget item: ${existing.item_name}`,
    metadata: { budget_entry_id: entryId },
  });

  return true;
}
