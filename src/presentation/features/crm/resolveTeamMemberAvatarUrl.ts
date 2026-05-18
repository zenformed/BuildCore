import type { CrmTeamMemberRef } from '@/domain/crm';
import type { CurrentUserAvatarContextValue } from '@/presentation/providers/CurrentUserAvatarContext';

/**
 * Prefer API-provided avatar URL; fall back to the header's loaded blob URL for the signed-in user.
 */
export function resolveTeamMemberAvatarUrl(
  member: CrmTeamMemberRef,
  currentUser: CurrentUserAvatarContextValue
): string | null {
  if (member.avatarUrl) return member.avatarUrl;
  if (
    currentUser.currentUserId != null &&
    member.id === currentUser.currentUserId &&
    currentUser.currentUserAvatarUrl
  ) {
    return currentUser.currentUserAvatarUrl;
  }
  return null;
}
