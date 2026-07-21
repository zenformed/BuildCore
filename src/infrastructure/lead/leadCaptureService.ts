import type { SupabaseClient } from '@supabase/supabase-js';
import { INDUSTRY_LABELS } from '@/domain/crm';
import { asCrmIndustry, type CrmIndustry } from '@/domain/crm/industry';
import type {
  LeadCapturePublicContext,
  LeadCaptureSubmitInput,
  LeadCaptureSubmitResult,
} from '@/domain/lead/leadCapture';
import { primaryContactEmail } from '@/domain/crm/contactMultiValue';
import { titleCasePersonOrEntityName } from '@/domain/crm/titleCaseName';
import {
  buildLeadCaptureSubprojectCreateInput,
  createCrmClientAndContactForOrg,
  createCrmClientForOrg,
  createCrmLeadSubprojectForOrg,
} from '@/infrastructure/crm/server/crmCreateService';
import {
  buildLeadCaptureFullName,
  mergeLeadCaptureContactFields,
  type LeadCaptureContactRow,
} from '@/infrastructure/lead/leadCaptureContactMerge';
import {
  LeadCaptureInvalidTokenError,
  LeadCapturePersistenceError,
} from '@/infrastructure/lead/leadCaptureErrors';
import { assertLeadCaptureRateLimit } from '@/infrastructure/lead/leadCaptureRateLimit';
import {
  pickLeadCaptureContactFromRows,
  type LeadCaptureContactLookupRow,
} from '@/infrastructure/lead/pickLeadCaptureContactFromRows';
import { downloadProjectPrimaryPhotoForOrg } from '@/infrastructure/crm/server/crmProjectPrimaryPhotoService';

type LeadCaptureProjectRow = {
  readonly id: string;
  readonly slug: string;
  readonly organization_id: string;
  readonly parent_project_id: string | null;
  readonly name: string;
  readonly industry: string | null;
  readonly custom_industry: string | null;
  readonly archived_at: string | null;
  readonly lead_token: string;
  readonly primary_photo_path: string | null;
  readonly crm_clients: { readonly company_name: string } | { readonly company_name: string }[] | null;
  readonly platform_organizations:
    | { readonly name: string }
    | { readonly name: string }[]
    | null;
};

const INVALID_CONTEXT: LeadCapturePublicContext = {
  state: 'invalid',
  projectName: '',
  organizationName: '',
  industry: null,
  hasProjectPhoto: false,
};

function unwrapJoin<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function resolveIndustryLabel(row: LeadCaptureProjectRow): string | null {
  const industry = row.industry;
  if (industry == null || industry.trim().length === 0) return null;
  if (industry === 'other') {
    const custom = row.custom_industry?.trim() ?? '';
    return custom.length > 0 ? custom : null;
  }
  return INDUSTRY_LABELS[industry as CrmIndustry] ?? industry;
}

function mapProjectRowToContext(row: LeadCaptureProjectRow): LeadCapturePublicContext {
  const client = unwrapJoin(row.crm_clients);
  const organization = unwrapJoin(row.platform_organizations);
  const organizationName =
    organization?.name?.trim() ||
    client?.company_name?.trim() ||
    row.name.trim();

  return {
    state: 'ready',
    projectName: row.name.trim(),
    organizationName,
    industry: resolveIndustryLabel(row),
    hasProjectPhoto: row.primary_photo_path != null,
  };
}

function resolveParentIndustryFields(
  row: LeadCaptureProjectRow
): { readonly industry: ReturnType<typeof asCrmIndustry>; readonly customIndustry: string | null } {
  if (row.industry != null && row.industry.trim().length > 0) {
    return {
      industry: asCrmIndustry(row.industry),
      customIndustry: row.custom_industry ?? null,
    };
  }
  return { industry: 'hvac', customIndustry: null };
}

function buildLeadCaptureSubprojectName(fullName: string): string {
  const titled = titleCasePersonOrEntityName(fullName);
  return titled.length > 0 ? titled : fullName.trim();
}

async function loadProjectByLeadToken(
  supabase: SupabaseClient,
  leadToken: string
): Promise<LeadCaptureProjectRow | null> {
  const { data, error } = await supabase
    .from('crm_projects')
    .select(
      `
      id,
      slug,
      organization_id,
      parent_project_id,
      name,
      industry,
      custom_industry,
      archived_at,
      lead_token,
      primary_photo_path,
      crm_clients ( company_name ),
      platform_organizations ( name )
    `
    )
    .eq('lead_token', leadToken)
    .maybeSingle();

  if (error) throw new LeadCapturePersistenceError(error.message);
  if (data == null) return null;
  if (data.archived_at != null) return null;
  return data as LeadCaptureProjectRow;
}

export async function getLeadCaptureProjectPhoto(
  supabase: SupabaseClient,
  leadToken: string
): Promise<{ readonly buffer: Buffer; readonly contentType: string } | null> {
  const normalizedToken = leadToken.trim();
  if (!normalizedToken) return null;

  const row = await loadProjectByLeadToken(supabase, normalizedToken);
  if (row?.primary_photo_path == null) return null;

  return downloadProjectPrimaryPhotoForOrg(
    supabase,
    row.organization_id,
    row.slug
  );
}

async function findContactByEmail(
  supabase: SupabaseClient,
  organizationId: string,
  email: string
): Promise<LeadCaptureContactRow | null> {
  const { data, error } = await supabase
    .from('crm_contacts')
    .select('id, full_name, email, phone, client_id, updated_at, created_at')
    .eq('organization_id', organizationId)
    .ilike('email', email);

  if (error) throw new LeadCapturePersistenceError(error.message);
  return pickLeadCaptureContactFromRows((data ?? []) as LeadCaptureContactLookupRow[]);
}

async function resolveLeadCaptureContactParty(
  supabase: SupabaseClient,
  organizationId: string,
  params: {
    readonly fullName: string;
    readonly contactName: string;
    readonly emails: readonly string[];
    readonly phones: readonly string[];
  }
): Promise<{
  readonly clientId: string;
  readonly contactId: string;
  readonly contactCreated: boolean;
  readonly contactUpdated: boolean;
}> {
  const lookupEmail = primaryContactEmail(params.emails);
  const existingContact = await findContactByEmail(supabase, organizationId, lookupEmail);

  if (existingContact != null) {
    let clientId = existingContact.client_id?.trim() ?? '';
    if (clientId.length === 0) {
      const createdClient = await createCrmClientForOrg(
        supabase,
        organizationId,
        params.contactName
      );
      clientId = createdClient.clientId;
    }

    const merged = mergeLeadCaptureContactFields(existingContact, {
      fullName: params.fullName,
      phones: params.phones,
      clientId,
    });
    const { error } = await supabase
      .from('crm_contacts')
      .update(merged)
      .eq('id', existingContact.id)
      .eq('organization_id', organizationId);

    if (error) throw new LeadCapturePersistenceError(error.message);

    return {
      clientId,
      contactId: existingContact.id,
      contactCreated: false,
      contactUpdated: true,
    };
  }

  try {
    const party = await createCrmClientAndContactForOrg(supabase, organizationId, {
      companyName: params.contactName,
      contactName: params.contactName,
      emails: [...params.emails],
      phones: [...params.phones],
    });
    return {
      clientId: party.clientId,
      contactId: party.contactId,
      contactCreated: true,
      contactUpdated: false,
    };
  } catch (err) {
    const detail = err instanceof Error ? err.message : 'Failed to create contact.';
    throw new LeadCapturePersistenceError(detail);
  }
}

export async function getLeadCapturePublicContext(
  supabase: SupabaseClient,
  leadToken: string
): Promise<LeadCapturePublicContext> {
  const normalizedToken = leadToken.trim();
  if (!normalizedToken) return INVALID_CONTEXT;

  const project = await loadProjectByLeadToken(supabase, normalizedToken);
  if (project == null) return INVALID_CONTEXT;
  if (project.parent_project_id != null) return INVALID_CONTEXT;

  return mapProjectRowToContext(project);
}

export async function submitLeadCaptureForToken(
  supabase: SupabaseClient,
  leadToken: string,
  input: LeadCaptureSubmitInput
): Promise<LeadCaptureSubmitResult> {
  const normalizedToken = leadToken.trim();
  if (!normalizedToken) {
    throw new LeadCaptureInvalidTokenError();
  }

  assertLeadCaptureRateLimit(normalizedToken);

  const parentProject = await loadProjectByLeadToken(supabase, normalizedToken);
  if (parentProject == null || parentProject.parent_project_id != null) {
    throw new LeadCaptureInvalidTokenError();
  }

  const fullName = buildLeadCaptureFullName(input.firstName, input.lastName);
  const contactName = buildLeadCaptureSubprojectName(fullName);
  const subprojectName = contactName;
  const { industry, customIndustry } = resolveParentIndustryFields(parentProject);

  const party = await resolveLeadCaptureContactParty(supabase, parentProject.organization_id, {
    fullName,
    contactName,
    emails: input.emails,
    phones: input.phones,
  });

  let createInput;
  try {
    createInput = await buildLeadCaptureSubprojectCreateInput(
      supabase,
      parentProject.organization_id,
      {
        parentProjectId: parentProject.id,
        subprojectName,
        contactName,
        emails: input.emails,
        phones: input.phones,
        industry,
        customIndustry,
        addressLine1: input.addressLine1,
        addressLine2: input.addressLine2,
        city: input.city,
        state: input.state,
        postalCode: input.postalCode,
      }
    );
  } catch (err) {
    const detail = err instanceof Error ? err.message : 'Failed to prepare subproject defaults.';
    throw new LeadCapturePersistenceError(detail);
  }

  let subproject;
  try {
    subproject = await createCrmLeadSubprojectForOrg(
      supabase,
      parentProject.organization_id,
      createInput,
      {
        clientId: party.clientId,
        contactId: party.contactId,
      }
    );
  } catch (err) {
    const detail = err instanceof Error ? err.message : 'Failed to create subproject.';
    throw new LeadCapturePersistenceError(detail);
  }

  return {
    contactCreated: party.contactCreated,
    contactUpdated: party.contactUpdated,
    subprojectSlug: subproject.slug,
    subprojectName: subproject.name,
  };
}
