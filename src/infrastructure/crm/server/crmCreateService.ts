import type { SupabaseClient } from '@supabase/supabase-js';
import type { CreateCrmProjectInput, CreateCrmProjectResult } from '@/domain/crm/createProject';
import { ensureUniqueProjectSlug, slugifyProjectName } from './crmSlug';

export async function createCrmProjectForOrg(
  supabase: SupabaseClient,
  organizationId: string,
  actorUserId: string,
  input: CreateCrmProjectInput
): Promise<CreateCrmProjectResult> {
  const baseSlug = slugifyProjectName(input.name);
  const slug = await ensureUniqueProjectSlug(supabase, organizationId, baseSlug);

  const { data: clientRow, error: clientError } = await supabase
    .from('crm_clients')
    .insert({
      organization_id: organizationId,
      company_name: input.name,
    })
    .select('id')
    .single();

  if (clientError || !clientRow) {
    throw new Error(clientError?.message ?? 'Failed to create client');
  }

  const { data: contactRow, error: contactError } = await supabase
    .from('crm_contacts')
    .insert({
      organization_id: organizationId,
      client_id: clientRow.id,
      full_name: input.contactName,
      email: input.email || null,
      phone: input.phone || null,
    })
    .select('id')
    .single();

  if (contactError || !contactRow) {
    throw new Error(contactError?.message ?? 'Failed to create contact');
  }

  const now = new Date().toISOString();

  const { data: projectRow, error: projectError } = await supabase
    .from('crm_projects')
    .insert({
      organization_id: organizationId,
      slug,
      name: input.name,
      client_id: clientRow.id,
      primary_contact_id: contactRow.id,
      // Create form has no trade picker yet; DB default is also general-contractor (00001 migration).
      trade_type: 'general-contractor',
      priority: input.priority,
      current_stage_slug: input.currentStageSlug,
      waiting_on: input.waitingOn,
      notes: input.notes,
      deal_value_cents: input.dealValueCents,
      balance_cents: input.balanceRemainingCents,
      assigned_member_id: input.assignedMemberId,
      last_activity_at: now,
    })
    .select('id, slug')
    .single();

  if (projectError || !projectRow) {
    throw new Error(projectError?.message ?? 'Failed to create project');
  }

  const { error: accountabilityError } = await supabase.from('crm_accountability_events').insert({
    organization_id: organizationId,
    project_id: projectRow.id,
    actor_member_id: actorUserId,
    event_type: 'project_created',
    summary: `Lead created for ${input.name}`,
    metadata_json: { stage_slug: input.currentStageSlug },
  });

  if (accountabilityError) {
    throw new Error(accountabilityError.message);
  }

  return { id: projectRow.id, slug: projectRow.slug };
}
