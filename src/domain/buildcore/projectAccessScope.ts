/**
 * BuildCore project access is an opt-in, per-member capability. It is deliberately
 * independent of organization role so an organization can restrict one coordinator
 * without changing the behavior of coordinators elsewhere.
 */
export const BUILDCORE_PROJECT_ACCESS_SCOPES = ['all', 'assigned_only'] as const;

export type BuildCoreProjectAccessScope = (typeof BUILDCORE_PROJECT_ACCESS_SCOPES)[number];

export function isBuildCoreProjectAccessScope(value: unknown): value is BuildCoreProjectAccessScope {
  return typeof value === 'string' && (BUILDCORE_PROJECT_ACCESS_SCOPES as readonly string[]).includes(value);
}

export function isAssignedOnlyProjectAccess(scope: BuildCoreProjectAccessScope): boolean {
  return scope === 'assigned_only';
}

/** Server-side assignment rule for a user with the explicit restricted scope. */
export function normalizeProjectAssigneeForAccessScope(input: {
  readonly scope: BuildCoreProjectAccessScope;
  readonly actorUserId: string;
  readonly requestedAssigneeId: string | null;
}): string | null {
  return isAssignedOnlyProjectAccess(input.scope) ? input.actorUserId : input.requestedAssigneeId;
}

export function canAccessProjectForScope(input: {
  readonly scope: BuildCoreProjectAccessScope;
  readonly actorUserId: string;
  readonly assignedMemberId: string | null;
}): boolean {
  return !isAssignedOnlyProjectAccess(input.scope) || input.assignedMemberId === input.actorUserId;
}
