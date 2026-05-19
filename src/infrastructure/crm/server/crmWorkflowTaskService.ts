import type { SupabaseClient } from '@supabase/supabase-js';
import type { CrmWorkflowTask } from '@/domain/crm';
import type {
  CreateCrmWorkflowTaskInput,
  UpdateCrmWorkflowTaskInput,
} from '@/domain/crm/workflowTaskMutations';
import { PAYMENT_WORKFLOW_STAGE_SLUG } from '@/domain/crm/paymentWorkflow';
import { mapDbWorkflowTask, type DbCrmWorkflowTaskRow } from '@/infrastructure/crm/mappers/mapCrmFromDb';
import { loadCrmMemberMap } from './crmMemberMap';
import { appendCrmAccountabilityEvent } from './crmAccountability';
import { assertWorkflowTaskCanBeMarkedDone } from './crmDocumentService';
import { CrmDocumentServiceError } from '@/infrastructure/crm/errors';
import { isPaymentTaskRow, syncProjectBalanceFromPaymentTasks } from './crmPaymentBalance';

const TASK_SELECT =
  'id, project_id, title, stage_slug, status, documents_required, notes, due_at, completed_at, assigned_member_id, completed_by_member_id, sort_order, amount_cents';

async function mapTaskRow(
  supabase: SupabaseClient,
  row: DbCrmWorkflowTaskRow
): Promise<CrmWorkflowTask> {
  const ids = [row.assigned_member_id, row.completed_by_member_id].filter(
    (id): id is string => id != null
  );
  const memberById = await loadCrmMemberMap(supabase, ids);
  return mapDbWorkflowTask(row, memberById);
}

async function getTaskForOrg(
  supabase: SupabaseClient,
  organizationId: string,
  taskId: string
): Promise<DbCrmWorkflowTaskRow | null> {
  const { data, error } = await supabase
    .from('crm_workflow_tasks')
    .select(TASK_SELECT)
    .eq('id', taskId)
    .eq('organization_id', organizationId)
    .is('archived_at', null)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as DbCrmWorkflowTaskRow | null) ?? null;
}

function resolvePaymentStageSlug(amountCents: number | null | undefined): string | undefined {
  return amountCents != null ? PAYMENT_WORKFLOW_STAGE_SLUG : undefined;
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
  const stageSlug = resolvePaymentStageSlug(input.amountCents) ?? input.stageSlug;
  const isPayment = input.amountCents != null;

  const { data, error } = await supabase
    .from('crm_workflow_tasks')
    .insert({
      organization_id: organizationId,
      project_id: input.projectId,
      title: input.title,
      stage_slug: stageSlug,
      status: input.status,
      documents_required: input.documentsRequired,
      notes: input.notes,
      due_at: input.dueAt,
      assigned_member_id: input.assignedMemberId,
      sort_order: sortOrder,
      amount_cents: input.amountCents ?? null,
    })
    .select(TASK_SELECT)
    .single();

  if (error || !data) throw new Error(error?.message ?? 'Failed to create workflow task');

  await appendCrmAccountabilityEvent(supabase, {
    organizationId,
    projectId: input.projectId,
    actorMemberId: actorUserId,
    eventType: isPayment ? 'payment_task_created' : 'workflow_task_created',
    summary: isPayment
      ? `Created payment milestone: ${input.title}`
      : `Created workflow task: ${input.title}`,
    workflowTaskId: data.id,
    metadata: {
      stage_slug: stageSlug,
      status: input.status,
      ...(isPayment ? { amount_cents: input.amountCents } : {}),
    },
  });

  await supabase
    .from('crm_projects')
    .update({ last_activity_at: new Date().toISOString() })
    .eq('id', input.projectId);

  if (isPayment) {
    await syncProjectBalanceFromPaymentTasks(
      supabase,
      organizationId,
      input.projectId,
      actorUserId
    );
  }

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
  const wasPayment = isPaymentTaskRow(existing);
  const nextAmount =
    input.amountCents !== undefined ? input.amountCents : existing.amount_cents;
  const willBePayment = nextAmount != null;
  const amountChanged =
    input.amountCents !== undefined && input.amountCents !== existing.amount_cents;

  const patch: Record<string, unknown> = {};
  if (input.title !== undefined) patch.title = input.title;
  if (input.stageSlug !== undefined) patch.stage_slug = input.stageSlug;
  if (input.status !== undefined) patch.status = input.status;
  if (input.dueAt !== undefined) patch.due_at = input.dueAt;
  if (input.notes !== undefined) patch.notes = input.notes;
  if (input.documentsRequired !== undefined) patch.documents_required = input.documentsRequired;
  if (input.assignedMemberId !== undefined) patch.assigned_member_id = input.assignedMemberId;
  if (input.amountCents !== undefined) {
    patch.amount_cents = input.amountCents;
    if (input.amountCents != null) {
      patch.stage_slug = PAYMENT_WORKFLOW_STAGE_SLUG;
    }
  }

  if (nextStatus === 'done' && existing.status !== 'done') {
    await assertWorkflowTaskCanBeMarkedDone(supabase, organizationId, existing);
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
    .select(TASK_SELECT)
    .single();

  if (error || !data) throw new Error(error?.message ?? 'Failed to update workflow task');

  if (wasPayment || willBePayment) {
    if (amountChanged) {
      await appendCrmAccountabilityEvent(supabase, {
        organizationId,
        projectId: existing.project_id,
        actorMemberId: actorUserId,
        eventType: 'payment_task_amount_changed',
        summary: `Payment milestone "${data.title}" amount updated`,
        workflowTaskId: data.id,
        metadata: {
          previous_amount_cents: existing.amount_cents,
          amount_cents: data.amount_cents,
        },
      });
    }
    if (statusChanged) {
      await appendCrmAccountabilityEvent(supabase, {
        organizationId,
        projectId: existing.project_id,
        actorMemberId: actorUserId,
        eventType: 'payment_task_status_changed',
        summary: `Payment milestone "${data.title}" marked ${nextStatus.replace(/_/g, ' ')}`,
        workflowTaskId: data.id,
        metadata: { previous_status: existing.status, status: nextStatus },
      });
    } else if (!amountChanged) {
      await appendCrmAccountabilityEvent(supabase, {
        organizationId,
        projectId: existing.project_id,
        actorMemberId: actorUserId,
        eventType: 'workflow_task_updated',
        summary: `Updated payment milestone: ${data.title}`,
        workflowTaskId: data.id,
      });
    }
  } else if (statusChanged) {
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

  if (wasPayment || willBePayment) {
    await syncProjectBalanceFromPaymentTasks(
      supabase,
      organizationId,
      existing.project_id,
      actorUserId
    );
  }

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

  const wasPayment = isPaymentTaskRow(existing);
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
    eventType: wasPayment ? 'payment_task_archived' : 'workflow_task_archived',
    summary: wasPayment
      ? `Archived payment milestone: ${existing.title}`
      : `Archived workflow task: ${existing.title}`,
    workflowTaskId: taskId,
  });

  await supabase
    .from('crm_projects')
    .update({ last_activity_at: now })
    .eq('id', existing.project_id);

  if (wasPayment) {
    await syncProjectBalanceFromPaymentTasks(
      supabase,
      organizationId,
      existing.project_id,
      actorUserId
    );
  }

  return true;
}
