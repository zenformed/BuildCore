import { isBuildCoreMemberRole } from '@/domain/buildcore/memberRole';
import type { OrganizationMemberRole } from '@zenformed/core/organization-settings';

/**
 * Shared Project/Subproject status permission rule.
 * Workflow task assignment is intentionally ignored — only the project row assignee counts.
 */
export function canActorChangeCrmProjectStatus(input: {
  readonly role: OrganizationMemberRole | null | undefined;
  readonly actorUserId: string;
  readonly assignedMemberId: string | null;
}): boolean {
  if (!isBuildCoreMemberRole(input.role)) {
    // Owner, admin, coordinator (and non-member roles) may change any org record.
    return true;
  }
  const assigned = input.assignedMemberId?.trim() || null;
  if (assigned == null) return false;
  return assigned === input.actorUserId;
}
