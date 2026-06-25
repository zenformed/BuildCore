/**
 * Server-side Send Files permission checks for CRM communications.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { BuildCorePermissionDomain } from '@/domain/buildcore/rolePermissions';
import { requireBuildCoreRolePermissionFlag } from './buildCoreRolePermissionEnforcement';

export type SendAttachmentEntityType =
  | 'workflow_task'
  | 'payment'
  | 'budget_entry'
  | 'project'
  | 'subproject';

/** Maps task/payment/budget send entities to permission domains. Project/subproject are CRM-scoped. */
export function sendAttachmentEntityPermissionDomain(
  entityType: SendAttachmentEntityType
): BuildCorePermissionDomain | null {
  switch (entityType) {
    case 'workflow_task':
      return 'workflow_tasks';
    case 'payment':
      return 'payments';
    case 'budget_entry':
      return 'budget';
    default:
      return null;
  }
}

export async function requireBuildCoreSendFilesPermission(
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
    (flags) => flags.canSendFiles,
    'You do not have permission to send attachments.'
  );
}
