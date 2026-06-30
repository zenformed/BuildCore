/**
 * Visible custom column slots for the workflow tasks table (workflow scope only).
 */

export const WORKFLOW_TASK_TABLE_COLUMN_POSITIONS = [1, 2] as const;

export type WorkflowTaskTableColumnPosition = (typeof WORKFLOW_TASK_TABLE_COLUMN_POSITIONS)[number];

export type WorkflowTaskTableColumnSlots = {
  readonly slot1: string | null;
  readonly slot2: string | null;
};

export type WorkflowTaskTableColumnSlotAssignment = {
  readonly position: WorkflowTaskTableColumnPosition;
  readonly fieldKey: string | null;
};

export function isWorkflowTaskTableColumnPosition(
  value: number
): value is WorkflowTaskTableColumnPosition {
  return value === 1 || value === 2;
}

export function resolveWorkflowTaskTableColumnSlots(
  rows: ReadonlyArray<{ position: number; fieldKey: string }>
): WorkflowTaskTableColumnSlots {
  let slot1: string | null = null;
  let slot2: string | null = null;
  for (const row of rows) {
    if (row.position === 1) slot1 = row.fieldKey;
    if (row.position === 2) slot2 = row.fieldKey;
  }
  return { slot1, slot2 };
}

export function countConfiguredWorkflowTaskTableColumns(slots: WorkflowTaskTableColumnSlots): number {
  return (slots.slot1 ? 1 : 0) + (slots.slot2 ? 1 : 0);
}

/** Header/row grid positions: admins always see 2 slots; members see configured only. */
export function resolveWorkflowTaskTableCustomColumnCount(
  slots: WorkflowTaskTableColumnSlots,
  canManage: boolean
): 0 | 1 | 2 {
  const configured = countConfiguredWorkflowTaskTableColumns(slots);
  if (canManage) return 2;
  if (configured >= 2) return 2;
  if (configured === 1) return 1;
  return 0;
}

export type WorkflowTaskTableCustomColumnSlotView = {
  readonly position: WorkflowTaskTableColumnPosition;
  readonly fieldKey: string | null;
  readonly isPlaceholder: boolean;
};

export function buildWorkflowTaskTableCustomColumnSlotViews(
  slots: WorkflowTaskTableColumnSlots,
  canManage: boolean
): readonly WorkflowTaskTableCustomColumnSlotView[] {
  const count = resolveWorkflowTaskTableCustomColumnCount(slots, canManage);
  if (count === 0) return [];

  const views: WorkflowTaskTableCustomColumnSlotView[] = [];
  const slotKeys: [WorkflowTaskTableColumnPosition, string | null][] = [
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
