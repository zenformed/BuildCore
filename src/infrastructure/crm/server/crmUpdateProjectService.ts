import type { SupabaseClient } from '@supabase/supabase-js';
import type { CrmProjectDetail } from '@/domain/crm';
import type { UpdateCrmProjectInput } from '@/domain/crm/updateProject';
import { appendCrmAccountabilityEvent } from './crmAccountability';
import {
  buildCrmProjectIndustryWritePayload,
  getCrmProjectIndustrySchemaMode,
} from './crmProjectIndustrySchema';
import { getCrmProjectDetailBySlugForOrg } from './crmReadService';
import { buildCrmContactDbWritePayload } from '@/domain/crm/contactMultiValue';
import { upsertProjectCustomFieldValuesForProject } from './buildCoreProjectCustomFieldService';

export async function updateCrmProjectBySlugForOrg(
  supabase: SupabaseClient,
  organizationId: string,
  actorUserId: string,
  slug: string,
  input: UpdateCrmProjectInput
): Promise<CrmProjectDetail | null> {
  const existing = await getCrmProjectDetailBySlugForOrg(supabase, organizationId, slug);
  if (existing == null) return null;

  const now = new Date().toISOString();
  const stageChanged = existing.summary.currentStageSlug !== input.currentStageSlug;

  const { error: clientError } = await supabase
    .from('crm_clients')
    .update({ company_name: input.name })
    .eq('id', existing.summary.client.id)
    .eq('organization_id', organizationId);

  if (clientError) throw new Error(clientError.message);

  const contactPayload = buildCrmContactDbWritePayload(input.emails, input.phones);

  const { error: contactError } = await supabase
    .from('crm_contacts')
    .update({
      full_name: input.contactName,
      ...contactPayload,
    })
    .eq('id', existing.summary.contact.id)
    .eq('organization_id', organizationId);

  if (contactError) throw new Error(contactError.message);

  const industrySchemaMode = await getCrmProjectIndustrySchemaMode(supabase);

  const { error: projectError } = await supabase
    .from('crm_projects')
    .update({
      name: input.name,
      ...buildCrmProjectIndustryWritePayload(industrySchemaMode, input),
      priority: input.priority,
      current_stage_slug: input.currentStageSlug,
      notes: input.notes,
      deal_value_cents: input.dealValueCents,
      balance_cents: input.balanceRemainingCents,
      assigned_member_id: input.assignedMemberId,
      address_line_1: input.addressLine1,
      address_line_2: input.addressLine2,
      city: input.city,
      state: input.state,
      postal_code: input.postalCode,
      latitude: input.latitude,
      longitude: input.longitude,
      last_activity_at: now,
    })
    .eq('id', existing.summary.id)
    .eq('organization_id', organizationId);

  if (projectError) throw new Error(projectError.message);

  if (input.customFieldValues != null) {
    await upsertProjectCustomFieldValuesForProject(
      supabase,
      organizationId,
      {
        id: existing.summary.id,
        parentProjectId: existing.summary.parentProjectId,
      },
      input.customFieldValues
    );
  }

  await appendCrmAccountabilityEvent(supabase, {
    organizationId,
    projectId: existing.summary.id,
    actorMemberId: actorUserId,
    eventType: stageChanged ? 'project_stage_changed' : 'project_updated',
    summary: stageChanged
      ? `Moved project to ${input.currentStageSlug.replace(/-/g, ' ')}`
      : `Updated project ${input.name}`,
    metadata: {
      stage_slug: input.currentStageSlug,
      previous_stage_slug: existing.summary.currentStageSlug,
    },
  });

  return getCrmProjectDetailBySlugForOrg(supabase, organizationId, slug);
}
