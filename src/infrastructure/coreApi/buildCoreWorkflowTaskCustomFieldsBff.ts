import type {
  WorkflowTaskCustomFieldDefinition,
  WorkflowTaskCustomFieldScope,
  WorkflowTaskCustomFieldsMap,
} from '@/domain/buildcore/workflowTaskCustomFields';
import type { BuildCoreWorkflowTaskCustomFieldsResponse } from '@/infrastructure/crm/server/buildCoreWorkflowTaskCustomFieldService';
import {
  buildCoreAdminFetchInit,
  buildCoreAdminFetchUrl,
} from '@/infrastructure/coreApi/buildCoreAdminFetch';

export type { BuildCoreWorkflowTaskCustomFieldsResponse };

export type CreateWorkflowTaskCustomFieldResponse = BuildCoreWorkflowTaskCustomFieldsResponse & {
  readonly created?: WorkflowTaskCustomFieldDefinition;
};

function parseDefinition(json: unknown): WorkflowTaskCustomFieldDefinition | null {
  if (json == null || typeof json !== 'object') return null;
  const o = json as Record<string, unknown>;
  if (
    typeof o.id !== 'string' ||
    typeof o.fieldKey !== 'string' ||
    typeof o.label !== 'string' ||
    typeof o.fieldType !== 'string' ||
    typeof o.scope !== 'string' ||
    typeof o.displayOrder !== 'number' ||
    typeof o.isArchived !== 'boolean' ||
    typeof o.source !== 'string'
  ) {
    return null;
  }
  return {
    id: o.id,
    fieldKey: o.fieldKey,
    label: o.label,
    fieldType: o.fieldType as WorkflowTaskCustomFieldDefinition['fieldType'],
    scope: o.scope as WorkflowTaskCustomFieldDefinition['scope'],
    displayOrder: o.displayOrder,
    isArchived: o.isArchived,
    source: o.source as WorkflowTaskCustomFieldDefinition['source'],
  };
}

export function parseBuildCoreWorkflowTaskCustomFieldsJson(
  json: unknown
): BuildCoreWorkflowTaskCustomFieldsResponse | null {
  if (json == null || typeof json !== 'object') return null;
  const o = json as Record<string, unknown>;
  if (typeof o.canManage !== 'boolean' || !Array.isArray(o.definitions)) return null;

  const definitions: WorkflowTaskCustomFieldDefinition[] = [];
  for (const item of o.definitions) {
    const parsed = parseDefinition(item);
    if (parsed == null) return null;
    definitions.push(parsed);
  }

  return { definitions, canManage: o.canManage };
}

export async function fetchBuildCoreWorkflowTaskCustomFieldsBff(
  accessToken: string
): Promise<BuildCoreWorkflowTaskCustomFieldsResponse> {
  const res = await fetch(
    buildCoreAdminFetchUrl('/api/internal/organization/workflow-task-custom-fields'),
    buildCoreAdminFetchInit(accessToken, { method: 'GET' })
  );
  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new Error('Invalid custom fields response.');
  }
  if (!res.ok) {
    const message =
      json != null && typeof json === 'object' && typeof (json as Record<string, unknown>).message === 'string'
        ? String((json as Record<string, unknown>).message)
        : 'Could not load custom fields.';
    throw new Error(message);
  }
  const parsed = parseBuildCoreWorkflowTaskCustomFieldsJson(json);
  if (parsed == null) {
    throw new Error('Invalid custom fields response.');
  }
  return parsed;
}

export async function createBuildCoreWorkflowTaskCustomFieldBff(
  accessToken: string,
  input: { label: string; scope: WorkflowTaskCustomFieldScope; fieldType?: 'text' }
): Promise<CreateWorkflowTaskCustomFieldResponse> {
  const res = await fetch(
    buildCoreAdminFetchUrl('/api/internal/organization/workflow-task-custom-fields'),
    buildCoreAdminFetchInit(accessToken, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
  );
  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new Error('Invalid custom fields response.');
  }
  if (!res.ok) {
    const message =
      json != null && typeof json === 'object' && typeof (json as Record<string, unknown>).message === 'string'
        ? String((json as Record<string, unknown>).message)
        : 'Could not create custom field.';
    throw new Error(message);
  }
  const parsed = parseBuildCoreWorkflowTaskCustomFieldsJson(json);
  if (parsed == null) {
    throw new Error('Invalid custom fields response.');
  }
  const created =
    json != null && typeof json === 'object'
      ? parseDefinition((json as Record<string, unknown>).created)
      : null;
  return { ...parsed, ...(created ? { created } : {}) };
}

export async function patchBuildCoreWorkflowTaskCustomFieldBff(
  accessToken: string,
  scope: WorkflowTaskCustomFieldScope,
  fieldKey: string,
  patch: { label?: string; isArchived?: boolean }
): Promise<BuildCoreWorkflowTaskCustomFieldsResponse> {
  const res = await fetch(
    buildCoreAdminFetchUrl(
      `/api/internal/organization/workflow-task-custom-fields/${encodeURIComponent(fieldKey)}?scope=${encodeURIComponent(scope)}`
    ),
    buildCoreAdminFetchInit(accessToken, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
  );
  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new Error('Invalid custom fields response.');
  }
  if (!res.ok) {
    const message =
      json != null && typeof json === 'object' && typeof (json as Record<string, unknown>).message === 'string'
        ? String((json as Record<string, unknown>).message)
        : 'Could not update custom field.';
    throw new Error(message);
  }
  const parsed = parseBuildCoreWorkflowTaskCustomFieldsJson(json);
  if (parsed == null) {
    throw new Error('Invalid custom fields response.');
  }
  return parsed;
}

export type { WorkflowTaskCustomFieldsMap };
