/**
 * Server-side Download permission checks for CRM document routes.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { isPaymentWorkflowTask } from '@/domain/crm/paymentWorkflow';
import type { BuildCorePermissionDomain } from '@/domain/buildcore/rolePermissions';
import { resolveCrmProjectIdBySlug } from './resolveCrmProjectIdBySlug';
import { requireBuildCoreRolePermissionFlag } from './buildCoreRolePermissionEnforcement';

export async function resolveWorkflowTaskDocumentDownloadPermissionDomain(
  supabase: SupabaseClient,
  organizationId: string,
  projectSlug: string,
  workflowTaskId: string
): Promise<BuildCorePermissionDomain> {
  const projectId = await resolveCrmProjectIdBySlug(supabase, organizationId, projectSlug);
  if (projectId == null) {
    return 'workflow_tasks';
  }

  const { data, error } = await supabase
    .from('crm_workflow_tasks')
    .select('amount_cents')
    .eq('organization_id', organizationId)
    .eq('project_id', projectId)
    .eq('id', workflowTaskId)
    .maybeSingle();

  if (error != null || data == null) {
    return 'workflow_tasks';
  }

  return isPaymentWorkflowTask({ amountCents: data.amount_cents == null ? null : Number(data.amount_cents) })
    ? 'payments'
    : 'workflow_tasks';
}

export async function requireBuildCoreDownloadPermission(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
  domain: BuildCorePermissionDomain
) {
  return requireBuildCoreRolePermissionFlag(
    supabase,
    organizationId,
    userId,
    domain,
    (flags) => flags.canDownload,
    'You do not have permission to download attachments.'
  );
}
