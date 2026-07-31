/**
 * Keep-value merge selection model for future Update Existing / Merge flows.
 *
 * Interaction: choose which side's value(s) survive — never arrow direction.
 * Not wired to import execution yet; presentation + decision helpers only.
 */

export const MERGE_VALUE_SIDES = ['incoming', 'existing'] as const;
export type MergeValueSide = (typeof MERGE_VALUE_SIDES)[number];

export const DUPLICATE_RESOLVE_RECORD_ACTIONS = [
  'import_new',
  'update_existing',
  'skip',
] as const;
export type DuplicateResolveRecordAction = (typeof DUPLICATE_RESOLVE_RECORD_ACTIONS)[number];

export type MergeFieldCardinality = 'single' | 'multi';

/** Values already match — no selection UI; show match indicator only. */
export type MergeFieldIdentical = {
  readonly kind: 'identical';
  readonly fieldKey: string;
  readonly label: string;
  readonly value: string;
};

/** One surviving scalar value (radio-like). */
export type MergeFieldSingleConflict = {
  readonly kind: 'conflict';
  readonly cardinality: 'single';
  readonly fieldKey: string;
  readonly label: string;
  readonly incomingValue: string;
  readonly existingValue: string;
  /** Which side's value survives. */
  readonly selected: MergeValueSide;
};

/**
 * Multi-value field (emails, phones, tags).
 * Each side may be kept independently — both checked means keep both sets.
 */
export type MergeFieldMultiConflict = {
  readonly kind: 'conflict';
  readonly cardinality: 'multi';
  readonly fieldKey: string;
  readonly label: string;
  readonly incomingValues: readonly string[];
  readonly existingValues: readonly string[];
  readonly keepIncoming: boolean;
  readonly keepExisting: boolean;
};

export type MergeFieldState =
  | MergeFieldIdentical
  | MergeFieldSingleConflict
  | MergeFieldMultiConflict;

export type MergeFieldConflict = MergeFieldSingleConflict | MergeFieldMultiConflict;

function normalizeComparable(value: string): string {
  return value.trim().toLocaleLowerCase('en-US');
}

/** Build an identical or single-conflict field from two scalar values. */
export function buildScalarMergeField(input: {
  readonly fieldKey: string;
  readonly label: string;
  readonly incomingValue: string | null | undefined;
  readonly existingValue: string | null | undefined;
  /** Default when values differ. Prefer existing to avoid accidental overwrite. */
  readonly defaultSelected?: MergeValueSide;
}): MergeFieldIdentical | MergeFieldSingleConflict | null {
  const incoming = input.incomingValue?.trim() ?? '';
  const existing = input.existingValue?.trim() ?? '';
  if (!incoming && !existing) return null;
  if (incoming && existing && normalizeComparable(incoming) === normalizeComparable(existing)) {
    return {
      kind: 'identical',
      fieldKey: input.fieldKey,
      label: input.label,
      value: existing || incoming,
    };
  }
  if (!incoming || !existing) {
    // Only one side has a value — treat as conflict with that side pre-selected,
    // or identical-ish: still expose choice when both sides matter later.
    // For foundation: if only one side has data, auto-identical with that value.
    return {
      kind: 'identical',
      fieldKey: input.fieldKey,
      label: input.label,
      value: existing || incoming,
    };
  }
  return {
    kind: 'conflict',
    cardinality: 'single',
    fieldKey: input.fieldKey,
    label: input.label,
    incomingValue: incoming,
    existingValue: existing,
    selected: input.defaultSelected ?? 'existing',
  };
}

/** Build identical or multi-conflict from two value lists. */
export function buildMultiMergeField(input: {
  readonly fieldKey: string;
  readonly label: string;
  readonly incomingValues: readonly string[];
  readonly existingValues: readonly string[];
  readonly defaultKeepIncoming?: boolean;
  readonly defaultKeepExisting?: boolean;
}): MergeFieldIdentical | MergeFieldMultiConflict | null {
  const incoming = input.incomingValues.map((v) => v.trim()).filter(Boolean);
  const existing = input.existingValues.map((v) => v.trim()).filter(Boolean);
  if (incoming.length === 0 && existing.length === 0) return null;

  const incomingKey = incoming.map(normalizeComparable).sort().join('\u0000');
  const existingKey = existing.map(normalizeComparable).sort().join('\u0000');
  if (incoming.length > 0 && existing.length > 0 && incomingKey === existingKey) {
    return {
      kind: 'identical',
      fieldKey: input.fieldKey,
      label: input.label,
      value: existing.join(', '),
    };
  }

  if (incoming.length === 0 || existing.length === 0) {
    return {
      kind: 'identical',
      fieldKey: input.fieldKey,
      label: input.label,
      value: (existing.length > 0 ? existing : incoming).join(', '),
    };
  }

  return {
    kind: 'conflict',
    cardinality: 'multi',
    fieldKey: input.fieldKey,
    label: input.label,
    incomingValues: incoming,
    existingValues: existing,
    keepIncoming: input.defaultKeepIncoming ?? false,
    keepExisting: input.defaultKeepExisting ?? true,
  };
}

/** Defaults for Update Existing: keep BuildCore values on every conflict. */
export function defaultMergeFieldsForUpdateExisting(
  fields: readonly MergeFieldState[]
): MergeFieldState[] {
  return fields.map((field) => {
    if (field.kind === 'identical') return field;
    if (field.cardinality === 'single') {
      return { ...field, selected: 'existing' };
    }
    return { ...field, keepIncoming: false, keepExisting: true };
  });
}

/** Single-value: selecting one side deselects the other (radio). */
export function selectSingleMergeSide(
  field: MergeFieldSingleConflict,
  side: MergeValueSide
): MergeFieldSingleConflict {
  return { ...field, selected: side };
}

/**
 * Multi-value: toggle a side. At least one side must remain kept.
 * Returns the same field if the toggle would leave nothing selected.
 */
export function toggleMultiMergeSide(
  field: MergeFieldMultiConflict,
  side: MergeValueSide
): MergeFieldMultiConflict {
  if (side === 'incoming') {
    const nextKeepIncoming = !field.keepIncoming;
    if (!nextKeepIncoming && !field.keepExisting) return field;
    return { ...field, keepIncoming: nextKeepIncoming };
  }
  const nextKeepExisting = !field.keepExisting;
  if (!nextKeepExisting && !field.keepIncoming) return field;
  return { ...field, keepExisting: nextKeepExisting };
}

export function replaceMergeField(
  fields: readonly MergeFieldState[],
  next: MergeFieldState
): MergeFieldState[] {
  return fields.map((field) => (field.fieldKey === next.fieldKey ? next : field));
}

/** Surviving scalar (single conflict) or display string for identical. */
export function resolveSurvivingScalar(field: MergeFieldIdentical | MergeFieldSingleConflict): string {
  if (field.kind === 'identical') return field.value;
  return field.selected === 'incoming' ? field.incomingValue : field.existingValue;
}

/**
 * Surviving multi-values: union of kept sides, existing first then incoming,
 * deduped by normalized compare while preserving first-seen order.
 */
export function resolveSurvivingMultiValues(field: MergeFieldMultiConflict): readonly string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const pushAll = (values: readonly string[]) => {
    for (const value of values) {
      const key = normalizeComparable(value);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(value);
    }
  };
  if (field.keepExisting) pushAll(field.existingValues);
  if (field.keepIncoming) pushAll(field.incomingValues);
  return out;
}

export function isMergeFieldConflict(field: MergeFieldState): field is MergeFieldConflict {
  return field.kind === 'conflict';
}

/** Field choices only apply when the record action is Update Existing. */
export function mergeFieldSelectionEnabled(
  recordAction: DuplicateResolveRecordAction | null | undefined
): boolean {
  return recordAction === 'update_existing';
}
