import type {
  WorkflowTaskTableColumnPosition,
  WorkflowTaskTableColumnSlots,
} from '@/domain/buildcore/workflowTaskTableColumns';
import { resolveWorkflowTaskTableColumnSlots } from '@/domain/buildcore/workflowTaskTableColumns';
import type { BuildCoreWorkflowTaskTableColumnsResponse } from '@/infrastructure/crm/server/buildCoreWorkflowTaskTableColumnService';

const slotsByOrg = new Map<string, WorkflowTaskTableColumnSlots>();

function orgKey(): string {
  return 'mock-org';
}

export function getMockWorkflowTaskTableColumnsResponse(
  canManage = true
): BuildCoreWorkflowTaskTableColumnsResponse {
  return {
    slots: slotsByOrg.get(orgKey()) ?? { slot1: null, slot2: null },
    canManage,
  };
}

export function setMockWorkflowTaskTableColumn(
  position: WorkflowTaskTableColumnPosition,
  fieldKey: string | null,
  activeFieldKeys: ReadonlySet<string>
): WorkflowTaskTableColumnSlots {
  const current = slotsByOrg.get(orgKey()) ?? { slot1: null, slot2: null };
  const next = { ...current };

  if (fieldKey == null) {
    if (position === 1) next.slot1 = null;
    else next.slot2 = null;
  } else {
    if (!activeFieldKeys.has(fieldKey)) {
      throw new Error(`Unknown workflow custom field: ${fieldKey}`);
    }
    const other = position === 1 ? next.slot2 : next.slot1;
    if (other === fieldKey) {
      throw new Error('That custom field is already shown in another column.');
    }
    if (position === 1) next.slot1 = fieldKey;
    else next.slot2 = fieldKey;
  }

  slotsByOrg.set(orgKey(), next);
  return next;
}

export function resetMockWorkflowTaskTableColumnsStore(): void {
  slotsByOrg.clear();
}

export function listMockWorkflowTaskTableColumnRows(): WorkflowTaskTableColumnSlots {
  return slotsByOrg.get(orgKey()) ?? { slot1: null, slot2: null };
}

export function hydrateMockWorkflowTaskTableColumnsFromRows(
  rows: ReadonlyArray<{ position: number; fieldKey: string }>
): void {
  slotsByOrg.set(orgKey(), resolveWorkflowTaskTableColumnSlots(rows));
}
