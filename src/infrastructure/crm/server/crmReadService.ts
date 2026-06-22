import type { SupabaseClient } from '@supabase/supabase-js';
import type { CrmBudgetEntry, CrmProjectDetail, CrmProjectSummary, WorkflowTaskStatus } from '@/domain/crm';
import type { CrmProjectBudgetEntriesIndex } from '@/domain/crm/projectBudgetRollup';
import type { CrmProjectPaymentTasksIndex } from '@/domain/crm/projectPaymentValue';
import type { CrmProjectWorkflowTaskStatusIndex } from '@/domain/crm/projectWorkflowTaskStatusIndex';
import type {
  CrmProjectWorkflowProgressInput,
  CrmProjectWorkflowProgressInputIndex,
} from '@/domain/crm/projectWorkflowProgressInput';
import type { PipelineStageSlug } from '@/domain/crm/pipelineStage';
import type { PaymentBalanceTask } from '@/domain/crm/paymentWorkflow';
import { isWorkflowTaskStatus } from '@/domain/crm/workflowTaskStatuses';
import {
  mapDbBudgetEntry,
  mapDbProjectDetail,
  mapDbProjectSummary,
  type DbCrmAccountabilityRow,
  type DbCrmBudgetEntryRow,
  type DbCrmDocumentRow,
  type DbCrmMilestoneRow,
  type DbCrmProjectRow,
  type DbCrmProjectStageCompletionRow,
  type DbCrmWorkflowTaskRow,
} from '@/infrastructure/crm/mappers/mapCrmFromDb';
import { loadCrmMemberMap } from './crmMemberMap';
import {
  crmProjectIndustrySelectLines,
  getCrmProjectIndustrySchemaMode,
} from './crmProjectIndustrySchema';
import { loadOrganizationPipelineStageCatalog } from './pipelineStageService';
import { logCrmProjectDetailPerf, startCrmReadPerfTimer } from './crmReadPerf';

function buildProjectSummarySelect(mode: Awaited<ReturnType<typeof getCrmProjectIndustrySchemaMode>>): string {
  return `
  id,
  slug,
  parent_project_id,
  name,
${crmProjectIndustrySelectLines(mode)}
  priority,
  current_stage_slug,
  notes,
  deal_value_cents,
  balance_cents,
  assigned_member_id,
  last_activity_at,
  completed_at,
  completed_by,
  primary_photo_path,
  address_line_1,
  address_line_2,
  city,
  state,
  postal_code,
  client_id,
  primary_contact_id,
  crm_clients ( id, company_name ),
  crm_contacts:primary_contact_id ( id, full_name, email, phone, role_title )
`;
}

function collectMemberIds(rows: {
  projects?: readonly DbCrmProjectRow[];
  workflowTasks?: readonly DbCrmWorkflowTaskRow[];
  documents?: readonly DbCrmDocumentRow[];
  accountability?: readonly DbCrmAccountabilityRow[];
  budgetEntries?: readonly (DbCrmBudgetEntryRow & { created_by?: string | null })[];
  stageCompletions?: readonly DbCrmProjectStageCompletionRow[];
}): string[] {
  const ids = new Set<string>();
  for (const p of rows.projects ?? []) {
    if (p.assigned_member_id) ids.add(p.assigned_member_id);
    if (p.completed_by) ids.add(p.completed_by);
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
  for (const b of rows.budgetEntries ?? []) {
    if (b.assigned_to) ids.add(b.assigned_to);
    if (b.created_by) ids.add(b.created_by);
  }
  for (const completion of rows.stageCompletions ?? []) {
    if (completion.completed_by) ids.add(completion.completed_by);
  }
  return [...ids];
}

export async function listPaymentBalanceTasksByOrg(
  supabase: SupabaseClient,
  organizationId: string
): Promise<CrmProjectPaymentTasksIndex> {
  const { data: projectRows, error: projectError } = await supabase
    .from('crm_projects')
    .select('id')
    .eq('organization_id', organizationId)
    .is('archived_at', null);

  if (projectError) {
    throw new Error(projectError.message);
  }

  const projectIds = (projectRows ?? []).map((row) => row.id as string);
  if (projectIds.length === 0) {
    return new Map();
  }

  const { data: taskRows, error: taskError } = await supabase
    .from('crm_workflow_tasks')
    .select('project_id, id, title, amount_cents, status, paid_at')
    .in('project_id', projectIds)
    .not('amount_cents', 'is', null)
    .is('archived_at', null);

  if (taskError) {
    throw new Error(taskError.message);
  }

  const index = new Map<string, PaymentBalanceTask[]>();
  for (const row of taskRows ?? []) {
    const projectId = row.project_id as string;
    const tasks = index.get(projectId) ?? [];
    tasks.push({
      id: row.id as string,
      title: (row.title as string) ?? undefined,
      amountCents: Number(row.amount_cents),
      status: row.status as PaymentBalanceTask['status'],
      paidAt: (row.paid_at as string | null) ?? null,
    });
    index.set(projectId, tasks);
  }

  return index;
}

export async function listWorkflowTaskStatusesByOrg(
  supabase: SupabaseClient,
  organizationId: string
): Promise<CrmProjectWorkflowTaskStatusIndex> {
  const { data: projectRows, error: projectError } = await supabase
    .from('crm_projects')
    .select('id')
    .eq('organization_id', organizationId)
    .is('archived_at', null);

  if (projectError) {
    throw new Error(projectError.message);
  }

  const projectIds = (projectRows ?? []).map((row) => row.id as string);
  if (projectIds.length === 0) {
    return new Map();
  }

  const { data: taskRows, error: taskError } = await supabase
    .from('crm_workflow_tasks')
    .select('project_id, status')
    .in('project_id', projectIds)
    .is('archived_at', null);

  if (taskError) {
    throw new Error(taskError.message);
  }

  const index = new Map<string, Set<WorkflowTaskStatus>>();
  for (const row of taskRows ?? []) {
    const status = row.status as string;
    if (!isWorkflowTaskStatus(status)) continue;

    const projectId = row.project_id as string;
    const statuses = index.get(projectId) ?? new Set<WorkflowTaskStatus>();
    statuses.add(status);
    index.set(projectId, statuses);
  }

  return index;
}

export async function listWorkflowProgressInputsByOrg(
  supabase: SupabaseClient,
  organizationId: string
): Promise<CrmProjectWorkflowProgressInputIndex> {
  const { data: projectRows, error: projectError } = await supabase
    .from('crm_projects')
    .select('id')
    .eq('organization_id', organizationId)
    .is('archived_at', null);

  if (projectError) {
    throw new Error(projectError.message);
  }

  const projectIds = (projectRows ?? []).map((row) => row.id as string);
  if (projectIds.length === 0) {
    return new Map();
  }

  const [taskResult, stageCompletionResult] = await Promise.all([
    supabase
      .from('crm_workflow_tasks')
      .select('project_id, stage_slug, status, amount_cents')
      .in('project_id', projectIds)
      .is('archived_at', null),
    supabase
      .from('crm_project_stage_completions')
      .select('project_id, stage_slug')
      .eq('organization_id', organizationId)
      .in('project_id', projectIds),
  ]);

  if (taskResult.error) {
    throw new Error(taskResult.error.message);
  }
  if (stageCompletionResult.error) {
    throw new Error(stageCompletionResult.error.message);
  }

  const index = new Map<string, CrmProjectWorkflowProgressInput>();

  for (const projectId of projectIds) {
    index.set(projectId, { tasks: [], manualStageCompletionSlugs: [] });
  }

  for (const row of taskResult.data ?? []) {
    const status = row.status as string;
    if (!isWorkflowTaskStatus(status)) continue;

    const projectId = row.project_id as string;
    const current = index.get(projectId);
    if (current == null) continue;

    index.set(projectId, {
      ...current,
      tasks: [
        ...current.tasks,
        {
          stageSlug: row.stage_slug as PipelineStageSlug,
          status,
          amountCents:
            row.amount_cents == null ? null : Number(row.amount_cents),
        },
      ],
    });
  }

  for (const row of stageCompletionResult.data ?? []) {
    const projectId = row.project_id as string;
    const current = index.get(projectId);
    if (current == null) continue;

    const stageSlug = row.stage_slug as PipelineStageSlug;
    if (current.manualStageCompletionSlugs.includes(stageSlug)) continue;

    index.set(projectId, {
      ...current,
      manualStageCompletionSlugs: [...current.manualStageCompletionSlugs, stageSlug],
    });
  }

  return index;
}

export async function listBudgetEntriesByOrg(
  supabase: SupabaseClient,
  organizationId: string
): Promise<CrmProjectBudgetEntriesIndex> {
  const { data: projectRows, error: projectError } = await supabase
    .from('crm_projects')
    .select('id')
    .eq('organization_id', organizationId)
    .is('archived_at', null);

  if (projectError) {
    throw new Error(projectError.message);
  }

  const projectIds = (projectRows ?? []).map((row) => row.id as string);
  if (projectIds.length === 0) {
    return new Map();
  }

  const { data: entryRows, error: entryError } = await supabase
    .from('crm_project_budget_entries')
    .select(
      'id, project_id, item_name, category, cost_cents, budget_cents, notes, assigned_to, cost_incurred_at, created_at, updated_at, created_by, documents_required'
    )
    .in('project_id', projectIds)
    .is('deleted_at', null);

  if (entryError) {
    throw new Error(entryError.message);
  }

  const memberById = new Map<string, never>();
  const index = new Map<string, CrmBudgetEntry[]>();
  for (const row of (entryRows ?? []) as DbCrmBudgetEntryRow[]) {
    const projectId = row.project_id;
    const entries = index.get(projectId) ?? [];
    entries.push(mapDbBudgetEntry(row, memberById, 0));
    index.set(projectId, entries);
  }

  return index;
}

export async function listCrmProjectSummariesForOrg(
  supabase: SupabaseClient,
  organizationId: string,
  options?: { rootsOnly?: boolean }
): Promise<readonly CrmProjectSummary[]> {
  const industrySchemaMode = await getCrmProjectIndustrySchemaMode(supabase);
  const projectSelect = buildProjectSummarySelect(industrySchemaMode);
  let query = supabase
    .from('crm_projects')
    .select(projectSelect)
    .eq('organization_id', organizationId)
    .is('archived_at', null);

  if (options?.rootsOnly !== false) {
    query = query.is('parent_project_id', null);
  }

  const { data, error } = await query.order('last_activity_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const projects = (data ?? []) as unknown as DbCrmProjectRow[];
  const memberById = await loadCrmMemberMap(supabase, collectMemberIds({ projects }), {
    organizationId,
  });
  return projects.map((row) => mapDbProjectSummary(row, memberById));
}

export async function getCrmProjectSummaryBySlugForOrg(
  supabase: SupabaseClient,
  organizationId: string,
  slug: string
): Promise<CrmProjectSummary | null> {
  const industrySchemaMode = await getCrmProjectIndustrySchemaMode(supabase);
  const projectSelect = buildProjectSummarySelect(industrySchemaMode);
  const { data, error } = await supabase
    .from('crm_projects')
    .select(projectSelect)
    .eq('organization_id', organizationId)
    .eq('slug', slug)
    .is('archived_at', null)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!data) return null;

  const project = data as unknown as DbCrmProjectRow;
  const memberById = await loadCrmMemberMap(supabase, collectMemberIds({ projects: [project] }), {
    organizationId,
  });
  return mapDbProjectSummary(project, memberById);
}

export async function getCrmProjectDetailBySlugForOrg(
  supabase: SupabaseClient,
  organizationId: string,
  slug: string
): Promise<CrmProjectDetail | null> {
  const timings: Record<string, number> = {};
  let endTimer = startCrmReadPerfTimer();
  const industrySchemaMode = await getCrmProjectIndustrySchemaMode(supabase);
  const projectSelect = buildProjectSummarySelect(industrySchemaMode);
  const { data: projectData, error: projectError } = await supabase
    .from('crm_projects')
    .select(projectSelect)
    .eq('organization_id', organizationId)
    .eq('slug', slug)
    .is('archived_at', null)
    .maybeSingle();

  if (projectError) {
    throw new Error(projectError.message);
  }
  if (!projectData) return null;

  timings.projectRowMs = endTimer();
  endTimer = startCrmReadPerfTimer();

  const project = projectData as unknown as DbCrmProjectRow;

  const [tasksResult, documentsResult, milestonesResult, accountabilityResult, budgetResult, stageCompletionsResult, pipelineStages] =
    await Promise.all([
    supabase
      .from('crm_workflow_tasks')
      .select(
        'id, project_id, title, stage_slug, status, documents_required, notes, due_at, completed_at, assigned_member_id, assigned_contact_id, completed_by_member_id, sort_order, amount_cents, invoiced_at, paid_at'
      )
      .eq('project_id', project.id)
      .is('archived_at', null)
      .order('sort_order', { ascending: true }),
    supabase
      .from('crm_documents')
      .select(
        'id, project_id, workflow_task_id, budget_entry_id, document_type, file_name, safe_file_name, mime_type, file_size_bytes, upload_status, storage_path, storage_provider, storage_bucket, storage_key, uploaded_by_member_id, reviewed_by_member_id, reviewed_at, created_at, deleted_at'
      )
      .eq('project_id', project.id)
      .is('deleted_at', null)
      .eq('upload_status', 'ready')
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
    supabase
      .from('crm_project_budget_entries')
      .select(
        'id, project_id, item_name, category, cost_cents, budget_cents, notes, assigned_to, cost_incurred_at, documents_required, created_at, updated_at, created_by'
      )
      .eq('project_id', project.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: true }),
    supabase
      .from('crm_project_stage_completions')
      .select('id, organization_id, project_id, stage_slug, completed_at, completed_by, source')
      .eq('project_id', project.id)
      .eq('organization_id', organizationId),
    loadOrganizationPipelineStageCatalog(
      supabase,
      organizationId,
      project.parent_project_id != null ? 'subproject' : 'project'
    ),
  ]);

  if (tasksResult.error) throw new Error(tasksResult.error.message);
  if (documentsResult.error) throw new Error(documentsResult.error.message);
  if (milestonesResult.error) throw new Error(milestonesResult.error.message);
  if (accountabilityResult.error) throw new Error(accountabilityResult.error.message);
  if (budgetResult.error) throw new Error(budgetResult.error.message);
  if (stageCompletionsResult.error) throw new Error(stageCompletionsResult.error.message);

  timings.parallelCollectionsMs = endTimer();
  endTimer = startCrmReadPerfTimer();

  const workflowTasks = (tasksResult.data ?? []) as DbCrmWorkflowTaskRow[];
  const documents = (documentsResult.data ?? []) as DbCrmDocumentRow[];
  const milestones = (milestonesResult.data ?? []) as DbCrmMilestoneRow[];
  const accountability = (accountabilityResult.data ?? []) as DbCrmAccountabilityRow[];
  const budgetEntries = (budgetResult.data ?? []) as DbCrmBudgetEntryRow[];
  const manualStageCompletions = (stageCompletionsResult.data ?? []) as DbCrmProjectStageCompletionRow[];

  const memberById = await loadCrmMemberMap(
    supabase,
    collectMemberIds({
      projects: [project],
      workflowTasks,
      documents,
      accountability,
      budgetEntries,
      stageCompletions: manualStageCompletions,
    }),
    { organizationId }
  );

  timings.memberMapMs = endTimer();
  logCrmProjectDetailPerf(slug, timings);

  return mapDbProjectDetail({
    project,
    workflowTasks,
    manualStageCompletions,
    documents,
    milestones,
    accountability,
    budgetEntries,
    memberById,
    pipelineStages,
  });
}

export async function listCrmProjectChildSummariesForOrg(
  supabase: SupabaseClient,
  organizationId: string,
  parentProjectId: string
): Promise<readonly CrmProjectSummary[]> {
  const industrySchemaMode = await getCrmProjectIndustrySchemaMode(supabase);
  const projectSelect = buildProjectSummarySelect(industrySchemaMode);
  const { data, error } = await supabase
    .from('crm_projects')
    .select(projectSelect)
    .eq('organization_id', organizationId)
    .eq('parent_project_id', parentProjectId)
    .is('archived_at', null)
    .order('last_activity_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const projects = (data ?? []) as unknown as DbCrmProjectRow[];
  const memberById = await loadCrmMemberMap(supabase, collectMemberIds({ projects }), {
    organizationId,
  });
  return projects.map((row) => mapDbProjectSummary(row, memberById));
}

export async function getCrmProjectChildDetailBySlugsForOrg(
  supabase: SupabaseClient,
  organizationId: string,
  parentSlug: string,
  childSlug: string
): Promise<CrmProjectDetail | null> {
  const { data: parentRow, error: parentError } = await supabase
    .from('crm_projects')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('slug', parentSlug)
    .is('archived_at', null)
    .maybeSingle();

  if (parentError) {
    throw new Error(parentError.message);
  }
  if (!parentRow) return null;

  const childDetail = await getCrmProjectDetailBySlugForOrg(supabase, organizationId, childSlug);
  if (childDetail == null) return null;
  if (childDetail.summary.parentProjectId !== parentRow.id) return null;

  return childDetail;
}

/** Full project details for org-wide CRM reporting (N project fetches). */
export async function listCrmProjectsForReportingForOrg(
  supabase: SupabaseClient,
  organizationId: string
): Promise<readonly CrmProjectDetail[]> {
  const summaries = await listCrmProjectSummariesForOrg(supabase, organizationId, {
    rootsOnly: false,
  });
  const details = await Promise.all(
    summaries.map((summary) =>
      getCrmProjectDetailBySlugForOrg(supabase, organizationId, summary.slug)
    )
  );
  return details.filter((detail): detail is CrmProjectDetail => detail != null);
}

export type CrmProjectTimestampIndex = ReadonlyMap<
  string,
  { readonly createdAt: string; readonly updatedAt: string }
>;
