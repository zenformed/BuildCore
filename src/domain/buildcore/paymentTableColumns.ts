/**
 * Visible custom column slots for the payments table (payment scope only).
 */

export const PAYMENT_TABLE_COLUMN_POSITIONS = [1, 2] as const;

export type PaymentTableColumnPosition = (typeof PAYMENT_TABLE_COLUMN_POSITIONS)[number];

export type PaymentTableColumnSlots = {
  readonly slot1: string | null;
  readonly slot2: string | null;
};

export type PaymentTableColumnSlotAssignment = {
  readonly position: PaymentTableColumnPosition;
  readonly fieldKey: string | null;
};

export function isPaymentTableColumnPosition(value: number): value is PaymentTableColumnPosition {
  return value === 1 || value === 2;
}

export function resolvePaymentTableColumnSlots(
  rows: ReadonlyArray<{ position: number; fieldKey: string }>
): PaymentTableColumnSlots {
  let slot1: string | null = null;
  let slot2: string | null = null;
  for (const row of rows) {
    if (row.position === 1) slot1 = row.fieldKey;
    if (row.position === 2) slot2 = row.fieldKey;
  }
  return { slot1, slot2 };
}

export function countConfiguredPaymentTableColumns(slots: PaymentTableColumnSlots): number {
  return (slots.slot1 ? 1 : 0) + (slots.slot2 ? 1 : 0);
}

/** Header/row grid positions: admins always see 2 slots; members see configured only. */
export function resolvePaymentTableCustomColumnCount(
  slots: PaymentTableColumnSlots,
  canManage: boolean
): 0 | 1 | 2 {
  const configured = countConfiguredPaymentTableColumns(slots);
  if (canManage) return 2;
  if (configured >= 2) return 2;
  if (configured === 1) return 1;
  return 0;
}

export type PaymentTableCustomColumnSlotView = {
  readonly position: PaymentTableColumnPosition;
  readonly fieldKey: string | null;
  readonly isPlaceholder: boolean;
};

export function buildPaymentTableCustomColumnSlotViews(
  slots: PaymentTableColumnSlots,
  canManage: boolean
): readonly PaymentTableCustomColumnSlotView[] {
  const count = resolvePaymentTableCustomColumnCount(slots, canManage);
  if (count === 0) return [];

  const views: PaymentTableCustomColumnSlotView[] = [];
  const slotKeys: [PaymentTableColumnPosition, string | null][] = [
    [1, slots.slot1],
    [2, slots.slot2],
  ];

  for (let index = 0; index < count; index += 1) {
    const [position, fieldKey] = slotKeys[index]!;
    views.push({
      position,
      fieldKey,
      isPlaceholder: fieldKey == null,
    });
  }
  return views;
}
