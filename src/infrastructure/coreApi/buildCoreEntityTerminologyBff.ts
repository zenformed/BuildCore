import type { BuildCoreEntityTerminologyResponse } from '@/infrastructure/crm/server/buildCoreEntityTerminologyService';
import {
  buildCoreAdminFetchInit,
  buildCoreAdminFetchUrl,
} from '@/infrastructure/coreApi/buildCoreAdminFetch';
import {
  isBuildCoreEntityTerminologyKey,
  resolveEntityTerminology,
  type BuildCoreEntityTerminologyKey,
} from '@/domain/buildcore/entityTerminology';

export type { BuildCoreEntityTerminologyResponse };

export function parseBuildCoreEntityTerminologyJson(
  json: unknown
): BuildCoreEntityTerminologyResponse | null {
  if (json == null || typeof json !== 'object') return null;
  const o = json as Record<string, unknown>;
  if (typeof o.canEdit !== 'boolean' || o.terms == null || typeof o.terms !== 'object') {
    return null;
  }

  const termsRecord = o.terms as Record<string, unknown>;
  if (
    typeof termsRecord.project !== 'string' ||
    typeof termsRecord.subproject !== 'string' ||
    typeof termsRecord.projects !== 'string' ||
    typeof termsRecord.subprojects !== 'string'
  ) {
    return null;
  }

  const overrides: Partial<Record<BuildCoreEntityTerminologyKey, string>> = {};
  if (o.overrides != null && typeof o.overrides === 'object') {
    for (const [key, value] of Object.entries(o.overrides as Record<string, unknown>)) {
      if (isBuildCoreEntityTerminologyKey(key) && typeof value === 'string') {
        overrides[key] = value;
      }
    }
  }

  const defaults: Record<BuildCoreEntityTerminologyKey, string> = {
    project: 'Project',
    subproject: 'Subproject',
  };
  if (o.defaults != null && typeof o.defaults === 'object') {
    for (const [key, value] of Object.entries(o.defaults as Record<string, unknown>)) {
      if (isBuildCoreEntityTerminologyKey(key) && typeof value === 'string') {
        defaults[key] = value;
      }
    }
  }

  return {
    terms: resolveEntityTerminology({
      project: termsRecord.project,
      subproject: termsRecord.subproject,
    }),
    overrides,
    defaults,
    canEdit: o.canEdit,
  };
}

export async function fetchBuildCoreEntityTerminologyBff(
  accessToken: string
): Promise<BuildCoreEntityTerminologyResponse> {
  const res = await fetch(
    buildCoreAdminFetchUrl('/api/internal/organization/entity-terminology'),
    buildCoreAdminFetchInit(accessToken, { method: 'GET' })
  );
  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new Error('Invalid entity terminology response.');
  }
  if (!res.ok) {
    const message =
      json != null &&
      typeof json === 'object' &&
      typeof (json as Record<string, unknown>).message === 'string'
        ? String((json as Record<string, unknown>).message)
        : 'Could not load entity terminology.';
    throw new Error(message);
  }
  const parsed = parseBuildCoreEntityTerminologyJson(json);
  if (parsed == null) {
    throw new Error('Invalid entity terminology response.');
  }
  return parsed;
}

export async function patchBuildCoreEntityTerminologyBff(
  accessToken: string,
  entityKey: BuildCoreEntityTerminologyKey,
  displayName: string
): Promise<BuildCoreEntityTerminologyResponse> {
  const res = await fetch(
    buildCoreAdminFetchUrl('/api/internal/organization/entity-terminology'),
    buildCoreAdminFetchInit(accessToken, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entityKey, displayName }),
    })
  );
  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new Error('Invalid entity terminology response.');
  }
  if (!res.ok) {
    const message =
      json != null &&
      typeof json === 'object' &&
      typeof (json as Record<string, unknown>).message === 'string'
        ? String((json as Record<string, unknown>).message)
        : 'Could not save entity terminology.';
    throw new Error(message);
  }
  const parsed = parseBuildCoreEntityTerminologyJson(json);
  if (parsed == null) {
    throw new Error('Invalid entity terminology response.');
  }
  return parsed;
}
