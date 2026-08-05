/**
 * Projects/Subprojects list v2 feature flag (Phase 0).
 *
 * Default: OFF for all organizations.
 * Enable paths (either):
 *   - BUILDCORE_PROJECTS_LIST_V2=true  → all orgs
 *   - BUILDCORE_PROJECTS_LIST_V2_ORG_ALLOWLIST=uuid,uuid → listed orgs only
 *
 * Rollback: unset/false the env flag and clear the allowlist; v1 routes remain.
 * Client mirror (future UI switch only; Phase 0 does not switch UI):
 *   NEXT_PUBLIC_BUILDCORE_PROJECTS_LIST_V2 — ignored for server decisions.
 */

type EnvMap = Readonly<Record<string, string | undefined>>;

function parseOrgAllowlist(raw: string | undefined): ReadonlySet<string> {
  if (raw == null || raw.trim() === '') return new Set();
  const ids = raw
    .split(',')
    .map((part) => part.trim().toLowerCase())
    .filter((part) => part.length > 0);
  return new Set(ids);
}

export function isProjectsListV2GloballyEnabled(env: EnvMap = process.env): boolean {
  return env.BUILDCORE_PROJECTS_LIST_V2 === 'true';
}

export function getProjectsListV2OrgAllowlist(env: EnvMap = process.env): ReadonlySet<string> {
  return parseOrgAllowlist(env.BUILDCORE_PROJECTS_LIST_V2_ORG_ALLOWLIST);
}

/**
 * Server authority for whether v2 list APIs may be used for an organization.
 * When false, callers must continue using v1 endpoints.
 */
export function isProjectsListV2EnabledForOrganization(
  organizationId: string,
  env: EnvMap = process.env
): boolean {
  const orgId = organizationId.trim().toLowerCase();
  if (!orgId) return false;
  if (isProjectsListV2GloballyEnabled(env)) return true;
  return getProjectsListV2OrgAllowlist(env).has(orgId);
}

/** Client-visible hint for Phase 1 UI gating. Default false. Does not authorize server routes. */
export function isProjectsListV2ClientFlagEnabled(env: EnvMap = process.env): boolean {
  return env.NEXT_PUBLIC_BUILDCORE_PROJECTS_LIST_V2 === 'true';
}
