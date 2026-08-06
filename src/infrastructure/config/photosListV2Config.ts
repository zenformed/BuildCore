/**
 * Photos list v2 feature flag (organization-wide Photos page).
 *
 * Default: OFF for all organizations.
 * Enable paths (either):
 *   - BUILDCORE_PHOTOS_LIST_V2=true  → all orgs
 *   - BUILDCORE_PHOTOS_LIST_V2_ORG_ALLOWLIST=uuid,uuid → listed orgs only
 *
 * Rollback: unset/false the env flag and clear the allowlist; Photos stays on v1
 * (/api/crm/photos). Dedicated /photos/v2 returns 404 when disabled.
 * Client mirror (UI switch only; does not authorize server routes):
 *   NEXT_PUBLIC_BUILDCORE_PHOTOS_LIST_V2
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

export function isPhotosListV2GloballyEnabled(env: EnvMap = process.env): boolean {
  return env.BUILDCORE_PHOTOS_LIST_V2 === 'true';
}

export function getPhotosListV2OrgAllowlist(env: EnvMap = process.env): ReadonlySet<string> {
  return parseOrgAllowlist(env.BUILDCORE_PHOTOS_LIST_V2_ORG_ALLOWLIST);
}

/**
 * Server authority for whether Photos list v2 APIs may be used for an organization.
 */
export function isPhotosListV2EnabledForOrganization(
  organizationId: string,
  env: EnvMap = process.env
): boolean {
  const orgId = organizationId.trim().toLowerCase();
  if (!orgId) return false;
  if (isPhotosListV2GloballyEnabled(env)) return true;
  return getPhotosListV2OrgAllowlist(env).has(orgId);
}

/**
 * Client UI gate for Photos list v2. Default false. Does not authorize server routes.
 *
 * When `env` is omitted, reads `process.env.NEXT_PUBLIC_BUILDCORE_PHOTOS_LIST_V2` via a
 * static member access so Next.js can inline the value into the client bundle.
 */
export function isPhotosListV2ClientFlagEnabled(env?: EnvMap): boolean {
  if (env != null) {
    return env.NEXT_PUBLIC_BUILDCORE_PHOTOS_LIST_V2 === 'true';
  }
  return process.env.NEXT_PUBLIC_BUILDCORE_PHOTOS_LIST_V2 === 'true';
}
