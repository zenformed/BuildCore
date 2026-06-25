/**
 * Server-side Send Files permission checks for CRM communications.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import type { BuildCorePermissionDomain } from '@/domain/buildcore/rolePermissions';
import { resolveBuildCoreRoleAccessForUser } from './buildCoreRoleAccessService';
import {
  resolveBuildCoreWorkflowTaskAccessForUser,
  workflowTaskPermissionForbiddenResponse,
} from './buildCoreWorkflowTaskPermissionService';

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
): Promise<{ ok: true } | { ok: false; response: NextResponse }> {
  const canSendFiles =
    domain === 'workflow_tasks'
      ? (await resolveBuildCoreWorkflowTaskAccessForUser(supabase, organizationId, userId))
          .canSendFiles
      : (
          await resolveBuildCoreRoleAccessForUser(
            supabase,
            organizationId,
            userId,
            domain === 'payments' ? 'payments' : 'budget'
          )
        ).canSendFiles;

  if (!canSendFiles) {
    return {
      ok: false,
      response: workflowTaskPermissionForbiddenResponse(
        'You do not have permission to send attachments.'
      ),
    };
  }

  return { ok: true };
}
