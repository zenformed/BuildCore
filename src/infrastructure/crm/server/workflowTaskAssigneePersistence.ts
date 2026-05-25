import type { SupabaseClient } from '@supabase/supabase-js';
import {
  contactIdFromWorkflowTaskAssigneeId,
  isWorkflowTaskContactAssigneeId,
  workflowTaskAssigneeIdFromContactId,
} from '@/domain/crm/workflowTaskAssignee';

export type WorkflowTaskAssigneeDbColumns = {
  readonly assigned_member_id: string | null;
  readonly assigned_contact_id: string | null;
};

export function workflowTaskAssigneeIdFromDbColumns(row: {
  readonly assigned_member_id: string | null;
  readonly assigned_contact_id: string | null;
}): string | null {
  if (row.assigned_contact_id) {
    return workflowTaskAssigneeIdFromContactId(row.assigned_contact_id);
  }
  return row.assigned_member_id;
}

export async function resolveWorkflowTaskAssigneeDbColumns(
  supabase: SupabaseClient,
  projectId: string,
  assigneeId: string | null
): Promise<WorkflowTaskAssigneeDbColumns> {
  if (assigneeId == null || assigneeId === '') {
    return { assigned_member_id: null, assigned_contact_id: null };
  }

  if (isWorkflowTaskContactAssigneeId(assigneeId)) {
    const contactId = contactIdFromWorkflowTaskAssigneeId(assigneeId);
    if (contactId == null) {
      throw new Error('Customer assignee is invalid.');
    }

    const { data, error } = await supabase
      .from('crm_projects')
      .select('primary_contact_id')
      .eq('id', projectId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (data?.primary_contact_id !== contactId) {
      throw new Error('Customer assignee must match the project contact.');
    }

    return { assigned_member_id: null, assigned_contact_id: contactId };
  }

  return { assigned_member_id: assigneeId, assigned_contact_id: null };
}
