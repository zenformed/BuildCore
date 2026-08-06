/**
 * Documents list v2 feature flag (Phase 1A — Project/Subproject Documents tab).
 *
 * Default: OFF for all organizations.
 * Enable paths (either):
 *   - BUILDCORE_DOCUMENTS_LIST_V2=true  → all orgs
 *   - BUILDCORE_DOCUMENTS_LIST_V2_ORG_ALLOWLIST=uuid,uuid → listed orgs only
 *
 * Rollback: unset/false the env flag and clear the allowlist; Documents tab stays on v1
 * (embedded project.documents). Dedicated /documents/v2 returns 404 when disabled.
 * Client mirror (UI switch only; does not authorize server routes):
 *   NEXT_PUBLIC_BUILDCORE_DOCUMENTS_LIST_V2
 *
 * Separate from Projects list-v2 because later Documents migration affects
 * Workflow / Payments / Budget consumers of project.documents.
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

export function isDocumentsListV2GloballyEnabled(env: EnvMap = process.env): boolean {
  return env.BUILDCORE_DOCUMENTS_LIST_V2 === 'true';
}

export function getDocumentsListV2OrgAllowlist(env: EnvMap = process.env): ReadonlySet<string> {
  return parseOrgAllowlist(env.BUILDCORE_DOCUMENTS_LIST_V2_ORG_ALLOWLIST);
}

/**
 * Server authority for whether Documents list v2 APIs may be used for an organization.
 */
export function isDocumentsListV2EnabledForOrganization(
  organizationId: string,
  env: EnvMap = process.env
): boolean {
  const orgId = organizationId.trim().toLowerCase();
  if (!orgId) return false;
  if (isDocumentsListV2GloballyEnabled(env)) return true;
  return getDocumentsListV2OrgAllowlist(env).has(orgId);
}

/**
 * Client UI gate for Documents list v2. Default false. Does not authorize server routes.
 *
 * When `env` is omitted, reads `process.env.NEXT_PUBLIC_BUILDCORE_DOCUMENTS_LIST_V2` via a
 * static member access so Next.js can inline the value into the client bundle.
 */
export function isDocumentsListV2ClientFlagEnabled(env?: EnvMap): boolean {
  if (env != null) {
    return env.NEXT_PUBLIC_BUILDCORE_DOCUMENTS_LIST_V2 === 'true';
  }
  return process.env.NEXT_PUBLIC_BUILDCORE_DOCUMENTS_LIST_V2 === 'true';
}
