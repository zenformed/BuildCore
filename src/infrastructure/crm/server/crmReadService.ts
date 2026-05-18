import type { SupabaseClient } from '@supabase/supabase-js';
import type { CrmProjectDetail, CrmProjectSummary } from '@/domain/crm';
import {
  mapDbProjectDetail,
  mapDbProjectSummary,
  type DbCrmAccountabilityRow,
  type DbCrmDocumentRow,
  type DbCrmMilestoneRow,
  type DbCrmProjectRow,
  type DbCrmWorkflowTaskRow,
} from '@/infrastructure/crm/mappers/mapCrmFromDb';
import { loadCrmMemberMap } from './crmMemberMap';

const PROJECT_LIST_SELECT = `
  id,
  slug,
  name,
  trade_type,
  priority,
  current_stage_slug,
  waiting_on,
  notes,
  deal_value_cents,
  balance_cents,
  assigned_member_id,
  last_activity_at,
  client_id,
  primary_contact_id,
  crm_clients ( id, company_name ),
  crm_contacts:primary_contact_id ( id, full_name, email, phone, role_title )
`;

const PROJECT_DETAIL_SELECT = `
  id,
  slug,
  name,
  trade_type,
  priority,
  current_stage_slug,
  waiting_on,
  notes,
  deal_value_cents,
  balance_cents,
  assigned_member_id,
  last_activity_at,
  client_id,
  primary_contact_id,
  crm_clients ( id, company_name ),
  crm_contacts:primary_contact_id ( id, full_name, email, phone, role_title )
`;

function collectMemberIds(rows: {
  projects?: readonly DbCrmProjectRow[];
  workflowTasks?: readonly DbCrmWorkflowTaskRow[];
  documents?: readonly DbCrmDocumentRow[];
  accountability?: readonly DbCrmAccountabilityRow[];
}): string[] {
  const ids = new Set<string>();
  for (const p of rows.projects ?? []) {
    if (p.assigned_member_id) ids.add(p.assigned_member_id);
  }
  for (const t of rows.workflowTasks ?? []) {
    if (t.assigned_member_id) ids.add(t.assigned_member_id);
    if (t.completed_by_member_id) ids.add(t.completed_by_member_id);
  }
  for (const d of rows.documents ?? []) {
    ids.add(d.uploaded_by_member_id);
    if (d.reviewed_by_member_id) ids.add(d.reviewed_by_member_id);
  }
  for (const a of rows.accountability ?? []) {
    ids.add(a.actor_member_id);
  }
  return [...ids];
}

export async function listCrmProjectSummariesForOrg(
  supabase: SupabaseClient,
  organizationId: string
): Promise<readonly CrmProjectSummary[]> {
  const { data, error } = await supabase
    .from('crm_projects')
    .select(PROJECT_LIST_SELECT)
    .eq('organization_id', organizationId)
    .is('archived_at', null)
    .order('last_activity_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const projects = (data ?? []) as DbCrmProjectRow[];
  const memberById = await loadCrmMemberMap(supabase, collectMemberIds({ projects }));
  return projects.map((row) => mapDbProjectSummary(row, memberById));
}

export async function getCrmProjectDetailBySlugForOrg(
  supabase: SupabaseClient,
  organizationId: string,
  slug: string
): Promise<CrmProjectDetail | null> {
  const { data: projectData, error: projectError } = await supabase
    .from('crm_projects')
    .select(PROJECT_DETAIL_SELECT)
    .eq('organization_id', organizationId)
    .eq('slug', slug)
    .is('archived_at', null)
    .maybeSingle();

  if (projectError) {
    throw new Error(projectError.message);
  }
  if (!projectData) return null;

  const project = projectData as DbCrmProjectRow;

  const [tasksResult, documentsResult, milestonesResult, accountabilityResult] = await Promise.all([
    supabase
      .from('crm_workflow_tasks')
      .select(
        'id, project_id, title, stage_slug, status, documents_required, notes, due_at, completed_at, assigned_member_id, completed_by_member_id, sort_order, amount_cents'
      )
      .eq('project_id', project.id)
      .is('archived_at', null)
      .order('sort_order', { ascending: true }),
    supabase
      .from('crm_documents')
      .select(
        'id, project_id, workflow_task_id, document_type, file_name, mime_type, file_size_bytes, upload_status, uploaded_by_member_id, reviewed_by_member_id, reviewed_at, created_at'
      )
      .eq('project_id', project.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('crm_milestones')
      .select('id, label, amount_cents, due_at, paid_at, status')
      .eq('project_id', project.id)
      .order('due_at', { ascending: true, nullsFirst: false }),
    supabase
      .from('crm_accountability_events')
      .select('id, event_type, summary, created_at, actor_member_id, workflow_task_id')
      .eq('project_id', project.id)
      .order('created_at', { ascending: false }),
  ]);

  if (tasksResult.error) throw new Error(tasksResult.error.message);
  if (documentsResult.error) throw new Error(documentsResult.error.message);
  if (milestonesResult.error) throw new Error(milestonesResult.error.message);
  if (accountabilityResult.error) throw new Error(accountabilityResult.error.message);

  const workflowTasks = (tasksResult.data ?? []) as DbCrmWorkflowTaskRow[];
  const documents = (documentsResult.data ?? []) as DbCrmDocumentRow[];
  const milestones = (milestonesResult.data ?? []) as DbCrmMilestoneRow[];
  const accountability = (accountabilityResult.data ?? []) as DbCrmAccountabilityRow[];

  const memberById = await loadCrmMemberMap(
    supabase,
    collectMemberIds({ projects: [project], workflowTasks, documents, accountability })
  );

  return mapDbProjectDetail({
    project,
    workflowTasks,
    documents,
    milestones,
    accountability,
    memberById,
  });
}
