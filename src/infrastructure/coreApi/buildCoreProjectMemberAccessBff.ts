import type { BuildCoreProjectAccessScope } from '@/domain/buildcore/projectAccessScope';
import { isBuildCoreProjectAccessScope } from '@/domain/buildcore/projectAccessScope';
import { buildCoreAdminFetchInit, buildCoreAdminFetchUrl } from './buildCoreAdminFetch';

export type BuildCoreProjectMemberAccessEntry = {
  readonly userId: string;
  readonly projectAccessScope: BuildCoreProjectAccessScope;
};

function parseEntry(value: unknown): BuildCoreProjectMemberAccessEntry | null {
  if (value == null || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  return typeof row.userId === 'string' && isBuildCoreProjectAccessScope(row.projectAccessScope)
    ? { userId: row.userId, projectAccessScope: row.projectAccessScope }
    : null;
}

export function parseBuildCoreProjectMemberAccessJson(
  json: unknown
): readonly BuildCoreProjectMemberAccessEntry[] | null {
  if (json == null || typeof json !== 'object' || !Array.isArray((json as Record<string, unknown>).entries)) {
    return null;
  }
  const rawEntries = (json as Record<string, unknown>).entries as unknown[];
  const entries = rawEntries
    .map(parseEntry)
    .filter((entry): entry is BuildCoreProjectMemberAccessEntry => entry != null);
  return entries.length === rawEntries.length ? entries : null;
}

export async function fetchBuildCoreProjectMemberAccessBff(
  accessToken: string
): Promise<readonly BuildCoreProjectMemberAccessEntry[]> {
  const res = await fetch(
    buildCoreAdminFetchUrl('/api/internal/organization/project-member-access'),
    buildCoreAdminFetchInit(accessToken)
  );
  const json: unknown = await res.json().catch(() => null);
  if (!res.ok) throw new Error('Could not load project visibility settings.');
  const entries = parseBuildCoreProjectMemberAccessJson(json);
  if (entries == null) throw new Error('Invalid project visibility settings response.');
  return entries;
}

export async function putBuildCoreProjectMemberAccessBff(
  accessToken: string,
  userId: string,
  projectAccessScope: BuildCoreProjectAccessScope
): Promise<BuildCoreProjectMemberAccessEntry> {
  const res = await fetch(
    buildCoreAdminFetchUrl(`/api/internal/organization/project-member-access/${encodeURIComponent(userId)}`),
    buildCoreAdminFetchInit(accessToken, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectAccessScope }),
    })
  );
  const json: unknown = await res.json().catch(() => null);
  if (!res.ok) throw new Error('Could not save project visibility.');
  const entry = parseEntry(json);
  if (entry == null) throw new Error('Invalid project visibility save response.');
  return entry;
}
