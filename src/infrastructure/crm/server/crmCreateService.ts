import type { SupabaseClient } from '@supabase/supabase-js';
import type { CreateCrmProjectInput, CreateCrmProjectResult } from '@/domain/crm/createProject';
import { getFirstPipelineStageSlug } from '@/domain/crm/pipelineStage';
import { getCrmProjectSummaryBySlugForOrg } from './crmReadService';
import { applyProjectTemplateBlueprintsToProject } from './crmProjectTemplateService';
import {
  buildCrmProjectIndustryWritePayload,
  getCrmProjectIndustrySchemaMode,
} from './crmProjectIndustrySchema';
import { loadOrganizationPipelineStageCatalog } from './pipelineStageService';
import { ensureUniqueProjectSlug, slugifyProjectName } from './crmSlug';
import { generateCrmProjectLeadToken } from '@/infrastructure/lead/generateLeadToken';
import { buildCrmContactDbWritePayload } from '@/domain/crm/contactMultiValue';

export type CrmClientContactParty = {
  readonly clientId: string;
  readonly contactId: string;
};

export async function createCrmClientForOrg(
  supabase: SupabaseClient,
  organizationId: string,
  companyName: string
): Promise<{ readonly clientId: string }> {
  const { data: clientRow, error: clientError } = await supabase
    .from('crm_clients')
    .insert({
      organization_id: organizationId,
      company_name: companyName,
    })
    .select('id')
    .single();

  if (clientError || !clientRow) {
    throw new Error(clientError?.message ?? 'Failed to create client');
  }

  return { clientId: clientRow.id };
}

export async function createCrmClientAndContactForOrg(
  supabase: SupabaseClient,
  organizationId: string,
  params: {
    readonly companyName: string;
    readonly contactName: string;
    readonly emails: readonly string[];
    readonly phones: readonly string[];
  }
): Promise<CrmClientContactParty> {
  const { clientId } = await createCrmClientForOrg(supabase, organizationId, params.companyName);
  const contactPayload = buildCrmContactDbWritePayload(params.emails, params.phones);

  const { data: contactRow, error: contactError } = await supabase
    .from('crm_contacts')
    .insert({
      organization_id: organizationId,
      client_id: clientId,
      full_name: params.contactName,
      ...contactPayload,
    })
    .select('id')
    .single();

  if (contactError || !contactRow) {
    throw new Error(contactError?.message ?? 'Failed to create contact');
  }

  return { clientId, contactId: contactRow.id };
}

async function assertParentProjectExists(
  supabase: SupabaseClient,
  organizationId: string,
  parentProjectId: string
): Promise<void> {
  const { data: parentRow, error: parentError } = await supabase
    .from('crm_projects')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('id', parentProjectId)
    .is('archived_at', null)
    .maybeSingle();

  if (parentError) {
    throw new Error(parentError.message);
  }
  if (!parentRow) {
    throw new Error('Parent project not found.');
  }
}

type InsertCrmProjectParams = {
  readonly slug: string;
  readonly clientId: string;
  readonly primaryContactId: string;
};

async function insertCrmProjectForOrg(
  supabase: SupabaseClient,
  organizationId: string,
  input: CreateCrmProjectInput,
  params: InsertCrmProjectParams
): Promise<{ readonly id: string; readonly slug: string }> {
  const now = new Date().toISOString();
  const industrySchemaMode = await getCrmProjectIndustrySchemaMode(supabase);

  const { data: projectRow, error: projectError } = await supabase
    .from('crm_projects')
    .insert({
      organization_id: organizationId,
      slug: params.slug,
      name: input.name,
      parent_project_id: input.parentProjectId ?? null,
      client_id: params.clientId,
      primary_contact_id: params.primaryContactId,
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
      last_activity_at: now,
      lead_token: generateCrmProjectLeadToken(),
    })
    .select('id, slug')
    .single();

  if (projectError || !projectRow) {
    throw new Error(projectError?.message ?? 'Failed to create project');
  }

  return { id: projectRow.id, slug: projectRow.slug };
}

/** Creates a subproject for public lead capture using an existing client/contact party. */
export async function createCrmLeadSubprojectForOrg(
  supabase: SupabaseClient,
  organizationId: string,
  input: CreateCrmProjectInput,
  party: CrmClientContactParty
): Promise<{ readonly id: string; readonly slug: string; readonly name: string }> {
  const parentProjectId = input.parentProjectId?.trim();
  if (!parentProjectId) {
    throw new Error('Parent project is required for lead subprojects.');
  }

  await assertParentProjectExists(supabase, organizationId, parentProjectId);

  const baseSlug = slugifyProjectName(input.name);
  const slug = await ensureUniqueProjectSlug(supabase, organizationId, baseSlug);
  const project = await insertCrmProjectForOrg(supabase, organizationId, input, {
    slug,
    clientId: party.clientId,
    primaryContactId: party.contactId,
  });

  return { id: project.id, slug: project.slug, name: input.name };
}

export async function createCrmProjectForOrg(
  supabase: SupabaseClient,
  organizationId: string,
  actorUserId: string,
  input: CreateCrmProjectInput
): Promise<CreateCrmProjectResult> {
  const party = await createCrmClientAndContactForOrg(supabase, organizationId, {
    companyName: input.name,
    contactName: input.contactName,
    emails: input.emails,
    phones: input.phones,
  });

  if (input.parentProjectId) {
    await assertParentProjectExists(supabase, organizationId, input.parentProjectId);
  }

  const baseSlug = slugifyProjectName(input.name);
  const slug = await ensureUniqueProjectSlug(supabase, organizationId, baseSlug);
  const projectRow = await insertCrmProjectForOrg(supabase, organizationId, input, {
    slug,
    clientId: party.clientId,
    primaryContactId: party.contactId,
  });

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

  const blueprints = input.initialTemplateBlueprints;
  if (
    blueprints != null &&
    (blueprints.workflowTasksPayload.length > 0 || blueprints.paymentsPayload.length > 0)
  ) {
    await applyProjectTemplateBlueprintsToProject(
      supabase,
      organizationId,
      actorUserId,
      projectRow.id,
      projectRow.slug,
      blueprints
    );
  }

  const summary = await getCrmProjectSummaryBySlugForOrg(supabase, organizationId, projectRow.slug);
  if (summary == null) {
    throw new Error('Failed to load created project summary.');
  }

  return { id: projectRow.id, slug: projectRow.slug, summary };
}

/** Builds create input defaults for a QR lead subproject under a parent project. */
export async function buildLeadCaptureSubprojectCreateInput(
  supabase: SupabaseClient,
  organizationId: string,
  params: {
    readonly parentProjectId: string;
    readonly subprojectName: string;
    readonly contactName: string;
    readonly emails: readonly string[];
    readonly phones: readonly string[];
    readonly industry: CreateCrmProjectInput['industry'];
    readonly customIndustry: string | null;
    readonly addressLine1: string;
    readonly addressLine2: string | null;
    readonly city: string;
    readonly state: string;
    readonly postalCode: string;
  }
): Promise<CreateCrmProjectInput> {
  const stageCatalog = await loadOrganizationPipelineStageCatalog(
    supabase,
    organizationId,
    'subproject'
  );

  return {
    name: params.subprojectName,
    industry: params.industry,
    customIndustry: params.customIndustry,
    contactName: params.contactName,
    emails: [...params.emails],
    phones: [...params.phones],
    priority: 'normal',
    currentStageSlug: getFirstPipelineStageSlug(stageCatalog),
    notes: null,
    dealValueCents: 0,
    balanceRemainingCents: 0,
    assignedMemberId: null,
    addressLine1: params.addressLine1,
    addressLine2: params.addressLine2,
    city: params.city,
    state: params.state,
    postalCode: params.postalCode,
    parentProjectId: params.parentProjectId,
  };
}
