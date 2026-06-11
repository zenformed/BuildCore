import type { SupabaseClient } from '@supabase/supabase-js';
import { formatOrganizationRoleLabel } from '@zenformed/core/dashboard-shell';
import { buildOrganizationExportWorkbook } from '@/export/organization/buildOrganizationExportData';
import { renderOrganizationExportWorkbook } from '@/export/organization/buildOrganizationExportWorkbook';
import type { OrganizationExportTeamMemberRow } from '@/export/organization/organizationExportTypes';
import { getOrganizationMembers } from '@/infrastructure/coreApi/organizationWorkspaceClient';
import {
  listCrmProjectsForReportingForOrg,
  type CrmProjectTimestampIndex,
} from './crmReadService';
import { loadOrganizationPipelineStageCatalog } from './pipelineStageService';

async function loadCrmProjectTimestampIndexForOrg(
  supabase: SupabaseClient,
  organizationId: string
): Promise<CrmProjectTimestampIndex> {
  const { data, error } = await supabase
    .from('crm_projects')
    .select('id, created_at, updated_at')
    .eq('organization_id', organizationId)
    .is('archived_at', null);

  if (error != null) {
    throw new Error(error.message);
  }

  const index = new Map<string, { createdAt: string; updatedAt: string }>();
  for (const row of data ?? []) {
    index.set(row.id as string, {
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    });
  }
  return index;
}

async function loadOrganizationTeamMembersForExport(
  accessToken: string
): Promise<readonly OrganizationExportTeamMemberRow[]> {
  const result = await getOrganizationMembers(accessToken);
  if (!result.ok) {
    throw new Error('Could not load organization team members for export.');
  }

  return result.data.members
    .filter((member) => member.status === 'active')
    .map((member) => ({
      name: member.displayName.trim() || member.email?.trim() || '—',
      email: member.email?.trim() ?? '—',
      role: formatOrganizationRoleLabel(member.role) ?? member.role,
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

export async function buildOrganizationExportXlsxForOrg(input: {
  supabase: SupabaseClient;
  organizationId: string;
  accessToken: string;
}): Promise<Buffer> {
  const [projects, projectTimestampsById, pipelineStages, teamMembers] = await Promise.all([
    listCrmProjectsForReportingForOrg(input.supabase, input.organizationId),
    loadCrmProjectTimestampIndexForOrg(input.supabase, input.organizationId),
    loadOrganizationPipelineStageCatalog(input.supabase, input.organizationId),
    loadOrganizationTeamMembersForExport(input.accessToken),
  ]);

  const stageLabelBySlug = new Map(pipelineStages.map((stage) => [stage.slug, stage.label]));
  const workbook = buildOrganizationExportWorkbook({
    projects,
    projectTimestampsById,
    stageLabelBySlug,
    teamMembers,
  });

  return renderOrganizationExportWorkbook(workbook);
}
