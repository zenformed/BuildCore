import type { SupabaseClient } from '@supabase/supabase-js';

export async function appendCrmAccountabilityEvent(
  supabase: SupabaseClient,
  input: {
    organizationId: string;
    projectId: string;
    actorMemberId: string;
    eventType: string;
    summary: string;
    workflowTaskId?: string | null;
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  const { error } = await supabase.from('crm_accountability_events').insert({
    organization_id: input.organizationId,
    project_id: input.projectId,
    actor_member_id: input.actorMemberId,
    event_type: input.eventType,
    summary: input.summary,
    workflow_task_id: input.workflowTaskId ?? null,
    metadata_json: input.metadata ?? {},
  });
  if (error) throw new Error(error.message);
}
