import type {
  WorkflowTaskTableColumnPosition,
  WorkflowTaskTableColumnSlots,
} from '@/domain/buildcore/workflowTaskTableColumns';
import type { BuildCoreWorkflowTaskTableColumnsResponse } from '@/infrastructure/crm/server/buildCoreWorkflowTaskTableColumnService';
import {
  buildCoreAdminFetchInit,
  buildCoreAdminFetchUrl,
} from '@/infrastructure/coreApi/buildCoreAdminFetch';

export type { BuildCoreWorkflowTaskTableColumnsResponse };

function parseSlots(json: unknown): WorkflowTaskTableColumnSlots | null {
  if (json == null || typeof json !== 'object') return null;
  const o = json as Record<string, unknown>;
  if (!('slot1' in o) || !('slot2' in o)) return null;
  const slot1 = o.slot1;
  const slot2 = o.slot2;
  if (slot1 !== null && typeof slot1 !== 'string') return null;
  if (slot2 !== null && typeof slot2 !== 'string') return null;
  return { slot1, slot2 };
}

export function parseBuildCoreWorkflowTaskTableColumnsJson(
  json: unknown
): BuildCoreWorkflowTaskTableColumnsResponse | null {
  if (json == null || typeof json !== 'object') return null;
  const o = json as Record<string, unknown>;
  if (typeof o.canManage !== 'boolean') return null;

  const slots = parseSlots(o.slots);
  if (slots == null) return null;

  return { slots, canManage: o.canManage };
}

export async function fetchBuildCoreWorkflowTaskTableColumnsBff(
  accessToken: string
): Promise<BuildCoreWorkflowTaskTableColumnsResponse> {
  const res = await fetch(
    buildCoreAdminFetchUrl('/api/internal/organization/workflow-task-table-columns'),
    buildCoreAdminFetchInit(accessToken, { method: 'GET' })
  );
  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new Error('Invalid table columns response.');
  }
  if (!res.ok) {
    const message =
      json != null && typeof json === 'object' && typeof (json as Record<string, unknown>).message === 'string'
        ? String((json as Record<string, unknown>).message)
        : 'Could not load table columns.';
    throw new Error(message);
  }
  const parsed = parseBuildCoreWorkflowTaskTableColumnsJson(json);
  if (parsed == null) {
    throw new Error('Invalid table columns response.');
  }
  return parsed;
}

export async function patchBuildCoreWorkflowTaskTableColumnBff(
  accessToken: string,
  input: { position: WorkflowTaskTableColumnPosition; fieldKey: string | null }
): Promise<BuildCoreWorkflowTaskTableColumnsResponse> {
  const res = await fetch(
    buildCoreAdminFetchUrl('/api/internal/organization/workflow-task-table-columns'),
    buildCoreAdminFetchInit(accessToken, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
  );
  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new Error('Invalid table columns response.');
  }
  if (!res.ok) {
    const message =
      json != null && typeof json === 'object' && typeof (json as Record<string, unknown>).message === 'string'
        ? String((json as Record<string, unknown>).message)
        : 'Could not update table column.';
    throw new Error(message);
  }
  const parsed = parseBuildCoreWorkflowTaskTableColumnsJson(json);
  if (parsed == null) {
    throw new Error('Invalid table columns response.');
  }
  return parsed;
}
