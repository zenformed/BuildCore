import type {
  PaymentTableColumnPosition,
  PaymentTableColumnSlots,
} from '@/domain/buildcore/paymentTableColumns';
import { resolvePaymentTableColumnSlots } from '@/domain/buildcore/paymentTableColumns';
import type { BuildCorePaymentTableColumnsResponse } from '@/infrastructure/crm/server/buildCorePaymentTableColumnService';

const slotsByOrg = new Map<string, PaymentTableColumnSlots>();

function orgKey(): string {
  return 'mock-org';
}

export function getMockPaymentTableColumnsResponse(
  canManage = true
): BuildCorePaymentTableColumnsResponse {
  return {
    slots: slotsByOrg.get(orgKey()) ?? { slot1: null, slot2: null },
    canManage,
  };
}

export function setMockPaymentTableColumn(
  position: PaymentTableColumnPosition,
  fieldKey: string | null,
  activeFieldKeys: ReadonlySet<string>
): PaymentTableColumnSlots {
  const current = slotsByOrg.get(orgKey()) ?? { slot1: null, slot2: null };
  const next = { ...current };

  if (fieldKey == null) {
    if (position === 1) next.slot1 = null;
    else next.slot2 = null;
  } else {
    if (!activeFieldKeys.has(fieldKey)) {
      throw new Error(`Unknown payment custom field: ${fieldKey}`);
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

export function resetMockPaymentTableColumnsStore(): void {
  slotsByOrg.clear();
}

export function listMockPaymentTableColumnRows(): PaymentTableColumnSlots {
  return slotsByOrg.get(orgKey()) ?? { slot1: null, slot2: null };
}

export function hydrateMockPaymentTableColumnsFromRows(
  rows: ReadonlyArray<{ position: number; fieldKey: string }>
): void {
  slotsByOrg.set(orgKey(), resolvePaymentTableColumnSlots(rows));
}
