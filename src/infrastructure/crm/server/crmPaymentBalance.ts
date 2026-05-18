import type { SupabaseClient } from '@supabase/supabase-js';
import { computeProjectBalanceCents, isPaymentWorkflowTask } from '@/domain/crm/paymentWorkflow';
import type { WorkflowTaskStatus } from '@/domain/crm';
import { appendCrmAccountabilityEvent } from './crmAccountability';

type PaymentTaskRow = {
  amount_cents: number | null;
  status: string;
};

export function balanceCentsFromPaymentTaskRows(
  tasks: readonly PaymentTaskRow[],
  fallbackBalanceCents: number
): number {
  const mapped = tasks
    .filter((row) => row.amount_cents != null)
    .map((row) => ({
      amountCents: Number(row.amount_cents),
      status: row.status as WorkflowTaskStatus,
    }));
  return computeProjectBalanceCents(mapped, fallbackBalanceCents);
}

export function hasPaymentWorkflowTasks(tasks: readonly PaymentTaskRow[]): boolean {
  return tasks.some((row) => row.amount_cents != null);
}

export async function syncProjectBalanceFromPaymentTasks(
  supabase: SupabaseClient,
  organizationId: string,
  projectId: string,
  actorMemberId: string,
  options?: { previousBalanceCents?: number }
): Promise<number> {
  const [{ data: projectRow, error: projectError }, { data: taskRows, error: tasksError }] =
    await Promise.all([
      supabase
        .from('crm_projects')
        .select('balance_cents')
        .eq('id', projectId)
        .eq('organization_id', organizationId)
        .maybeSingle(),
      supabase
        .from('crm_workflow_tasks')
        .select('amount_cents, status')
        .eq('project_id', projectId)
        .eq('organization_id', organizationId)
        .is('archived_at', null),
    ]);

  if (projectError) throw new Error(projectError.message);
  if (tasksError) throw new Error(tasksError.message);
  if (projectRow == null) throw new Error('Project not found');

  const storedBalance = Number(projectRow.balance_cents);
  const tasks = (taskRows ?? []) as PaymentTaskRow[];
  if (!hasPaymentWorkflowTasks(tasks)) return storedBalance;

  const nextBalance = balanceCentsFromPaymentTaskRows(tasks, storedBalance);
  if (nextBalance === storedBalance) return storedBalance;

  const { error: updateError } = await supabase
    .from('crm_projects')
    .update({ balance_cents: nextBalance })
    .eq('id', projectId)
    .eq('organization_id', organizationId);

  if (updateError) throw new Error(updateError.message);

  const previous =
    options?.previousBalanceCents !== undefined ? options.previousBalanceCents : storedBalance;

  await appendCrmAccountabilityEvent(supabase, {
    organizationId,
    projectId,
    actorMemberId,
    eventType: 'project_balance_recalculated',
    summary: `Balance updated to $${(nextBalance / 100).toFixed(2)} from payment milestones`,
    metadata: {
      previous_balance_cents: previous,
      balance_cents: nextBalance,
    },
  });

  return nextBalance;
}

/** For accountability metadata when a row is already mapped. */
export function isPaymentTaskRow(row: { amount_cents: number | null }): boolean {
  return row.amount_cents != null;
}

export { isPaymentWorkflowTask };
