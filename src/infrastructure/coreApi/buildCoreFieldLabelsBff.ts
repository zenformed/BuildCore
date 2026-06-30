import type { BuildCoreFieldLabelsResponse } from '@/infrastructure/crm/server/buildCoreFieldLabelService';
import {
  buildCoreAdminFetchInit,
  buildCoreAdminFetchUrl,
} from '@/infrastructure/coreApi/buildCoreAdminFetch';

export type { BuildCoreFieldLabelsResponse };

export function parseBuildCoreFieldLabelsJson(json: unknown): BuildCoreFieldLabelsResponse | null {
  if (json == null || typeof json !== 'object') return null;
  const o = json as Record<string, unknown>;
  if (
    typeof o.canEdit !== 'boolean' ||
    o.labels == null ||
    typeof o.labels !== 'object' ||
    o.defaults == null ||
    typeof o.defaults !== 'object'
  ) {
    return null;
  }

  const labels: Record<string, string> = {};
  for (const [key, value] of Object.entries(o.labels as Record<string, unknown>)) {
    if (typeof value === 'string') labels[key] = value;
  }

  const defaults: Record<string, string> = {};
  for (const [key, value] of Object.entries(o.defaults as Record<string, unknown>)) {
    if (typeof value === 'string') defaults[key] = value;
  }

  return { labels, defaults, canEdit: o.canEdit };
}

export async function fetchBuildCoreFieldLabelsBff(
  accessToken: string
): Promise<BuildCoreFieldLabelsResponse> {
  const res = await fetch(
    buildCoreAdminFetchUrl('/api/internal/organization/field-labels'),
    buildCoreAdminFetchInit(accessToken, { method: 'GET' })
  );
  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new Error('Invalid field labels response.');
  }
  if (!res.ok) {
    const message =
      json != null && typeof json === 'object' && typeof (json as Record<string, unknown>).message === 'string'
        ? String((json as Record<string, unknown>).message)
        : 'Could not load field labels.';
    throw new Error(message);
  }
  const parsed = parseBuildCoreFieldLabelsJson(json);
  if (parsed == null) {
    throw new Error('Invalid field labels response.');
  }
  return parsed;
}

export async function patchBuildCoreFieldLabelBff(
  accessToken: string,
  fieldKey: string,
  label: string
): Promise<BuildCoreFieldLabelsResponse> {
  const res = await fetch(
    buildCoreAdminFetchUrl('/api/internal/organization/field-labels'),
    buildCoreAdminFetchInit(accessToken, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fieldKey, label }),
    })
  );
  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new Error('Invalid field labels response.');
  }
  if (!res.ok) {
    const message =
      json != null && typeof json === 'object' && typeof (json as Record<string, unknown>).message === 'string'
        ? String((json as Record<string, unknown>).message)
        : 'Could not save field label.';
    throw new Error(message);
  }
  const parsed = parseBuildCoreFieldLabelsJson(json);
  if (parsed == null) {
    throw new Error('Invalid field labels response.');
  }
  return parsed;
}
