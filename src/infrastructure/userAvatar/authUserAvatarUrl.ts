/**
 * Stable app-relative URL for a user's profile photo (same BFF family as `/api/auth/avatar`).
 */

/** Returns a fetchable avatar URL only when the user has an uploaded photo revision. */
export function buildAuthUserAvatarUrl(
  userId: string,
  revision?: string | null
): string | null {
  if (revision == null || revision === '') return null;
  const params = new URLSearchParams({ userId, t: revision });
  return `/api/auth/user-avatar?${params.toString()}`;
}
