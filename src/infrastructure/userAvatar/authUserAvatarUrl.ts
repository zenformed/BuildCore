/**
 * Stable app-relative URL for a user's profile photo (same BFF family as `/api/auth/avatar`).
 */

export function buildAuthUserAvatarUrl(userId: string, revision?: string | null): string {
  const params = new URLSearchParams({ userId });
  if (revision != null && revision !== '') {
    params.set('t', revision);
  }
  return `/api/auth/user-avatar?${params.toString()}`;
}
