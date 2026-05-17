import type { SupabaseClient } from '@supabase/supabase-js';
import type { CrmWorkflowTask } from '@/domain/crm';
import type {
  CreateCrmWorkflowTaskInput,
  UpdateCrmWorkflowTaskInput,
} from '@/domain/crm/workflowTaskMutations';
import {
  mapDbWorkflowTask,
  mapProfileToTeamMemberRef,
  type DbCrmWorkflowTaskRow,
  type DbProfileRow,
} from '@/infrastructure/crm/mappers/mapCrmFromDb';
import { appendCrmAccountabilityEvent } from './crmAccountability';

async function loadMemberMap(
  supabase: SupabaseClient,
  memberIds: readonly string[]
): Promise<Map<string, ReturnType<typeof mapProfileToTeamMemberRef>>> {
  const map = new Map<string, ReturnType<typeof mapProfileToTeamMemberRef>>();
  if (memberIds.length === 0) return map;
  const { data } = await supabase.from('profiles').select('id, email').in('id', [...memberIds]);
  const profiles = (data ?? []) as DbProfileRow[];
  const profileById = new Map(profiles.map((p) => [p.id, p]));
  for (const id of memberIds) {
    map.set(id, mapProfileToTeamMemberRef(profileById.get(id), id));
  }
  return map;
}

async function mapTaskRow(
  supabase: SupabaseClient,
  row: DbCrmWorkflowTaskRow
): Promise<CrmWorkflowTask> {
  const ids = [row.assigned_member_id, row.completed_by_member_id].filter(
    (id): id is string => id != null
  );
  const memberById = await loadMemberMap(supabase, ids);
  return mapDbWorkflowTask(row, memberById);
}

async function getTaskForOrg(
  supabase: SupabaseClient,
  organizationId: string,
  taskId: string
): Promise<DbCrmWorkflowTaskRow | null> {
  const { data, error } = await supabase
    .from('crm_workflow_tasks')
    .select(
      'id, project_id, title, stage_slug, status, notes, due_at, completed_at, assigned_member_id, completed_by_member_id, sort_order'
    )
    .eq('id', taskId)
    .eq('organization_id', organizationId)
    .is('archived_at', null)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as DbCrmWorkflowTaskRow | null) ?? null;
}

export async function createCrmWorkflowTaskForOrg(
  supabase: SupabaseClient,
  organizationId: string,
  actorUserId: string,
  input: CreateCrmWorkflowTaskInput
): Promise<CrmWorkflowTask> {
  const { data: maxRow } = await supabase
    .from('crm_workflow_tasks')
    .select('sort_order')
    .eq('project_id', input.projectId)
    .is('archived_at', null)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();

  const sortOrder = (maxRow?.sort_order ?? 0) + 1;

  const { data, error } = await supabase
    .from('crm_workflow_tasks')
    .insert({
      organization_id: organizationId,
      project_id: input.projectId,
      title: input.title,
      stage_slug: input.stageSlug,
      status: input.status,
      notes: input.notes,
      due_at: input.dueAt,
      assigned_member_id: input.assignedMemberId,
      sort_order: sortOrder,
    })
    .select(
      'id, project_id, title, stage_slug, status, notes, due_at, completed_at, assigned_member_id, completed_by_member_id, sort_order'
    )
    .single();

  if (error || !data) throw new Error(error?.message ?? 'Failed to create workflow task');

  await appendCrmAccountabilityEvent(supabase, {
    organizationId,
    projectId: input.projectId,
    actorMemberId: actorUserId,
    eventType: 'workflow_task_created',
    summary: `Created workflow task: ${input.title}`,
    workflowTaskId: data.id,
    metadata: { stage_slug: input.stageSlug, status: input.status },
  });

  await supabase
    .from('crm_projects')
    .update({ last_activity_at: new Date().toISOString() })
    .eq('id', input.projectId);

  return mapTaskRow(supabase, data as DbCrmWorkflowTaskRow);
}

export async function updateCrmWorkflowTaskForOrg(
  supabase: SupabaseClient,
  organizationId: string,
  actorUserId: string,
  input: UpdateCrmWorkflowTaskInput
): Promise<CrmWorkflowTask | null> {
  const existing = await getTaskForOrg(supabase, organizationId, input.taskId);
  if (existing == null) return null;

  const nextStatus = input.status ?? existing.status;
  const statusChanged = nextStatus !== existing.status;
  const now = new Date().toISOString();

  const patch: Record<string, unknown> = {};
  if (input.title !== undefined) patch.title = input.title;
  if (input.stageSlug !== undefined) patch.stage_slug = input.stageSlug;
  if (input.status !== undefined) patch.status = input.status;
  if (input.dueAt !== undefined) patch.due_at = input.dueAt;
  if (input.notes !== undefined) patch.notes = input.notes;
  if (input.assignedMemberId !== undefined) patch.assigned_member_id = input.assignedMemberId;

  if (nextStatus === 'done' && existing.status !== 'done') {
    patch.completed_at = now;
    patch.completed_by_member_id = actorUserId;
  } else if (nextStatus !== 'done' && existing.status === 'done') {
    patch.completed_at = null;
    patch.completed_by_member_id = null;
  }

  const { data, error } = await supabase
    .from('crm_workflow_tasks')
    .update(patch)
    .eq('id', input.taskId)
    .eq('organization_id', organizationId)
    .select(
      'id, project_id, title, stage_slug, status, notes, due_at, completed_at, assigned_member_id, completed_by_member_id, sort_order'
    )
    .single();

  if (error || !data) throw new Error(error?.message ?? 'Failed to update workflow task');

  if (statusChanged) {
    await appendCrmAccountabilityEvent(supabase, {
      organizationId,
      projectId: existing.project_id,
      actorMemberId: actorUserId,
      eventType: 'workflow_task_status_changed',
      summary: `Task "${data.title}" marked ${nextStatus.replace(/_/g, ' ')}`,
      workflowTaskId: data.id,
      metadata: { previous_status: existing.status, status: nextStatus },
    });
  } else {
    await appendCrmAccountabilityEvent(supabase, {
      organizationId,
      projectId: existing.project_id,
      actorMemberId: actorUserId,
      eventType: 'workflow_task_updated',
      summary: `Updated workflow task: ${data.title}`,
      workflowTaskId: data.id,
    });
  }

  await supabase
    .from('crm_projects')
    .update({ last_activity_at: now })
    .eq('id', existing.project_id);

  return mapTaskRow(supabase, data as DbCrmWorkflowTaskRow);
}

export async function archiveCrmWorkflowTaskForOrg(
  supabase: SupabaseClient,
  organizationId: string,
  actorUserId: string,
  taskId: string
): Promise<boolean> {
  const existing = await getTaskForOrg(supabase, organizationId, taskId);
  if (existing == null) return false;

  const now = new Date().toISOString();
  const { error } = await supabase
    .from('crm_workflow_tasks')
    .update({ archived_at: now })
    .eq('id', taskId)
    .eq('organization_id', organizationId);

  if (error) throw new Error(error.message);

  await appendCrmAccountabilityEvent(supabase, {
    organizationId,
    projectId: existing.project_id,
    actorMemberId: actorUserId,
    eventType: 'workflow_task_archived',
    summary: `Archived workflow task: ${existing.title}`,
    workflowTaskId: taskId,
  });

  await supabase
    .from('crm_projects')
    .update({ last_activity_at: now })
    .eq('id', existing.project_id);

  return true;
}
