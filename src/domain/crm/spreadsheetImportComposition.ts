/**
 * Ordered multi-column composition for import names (project, subproject, contact).
 */

export type CrmImportNameSeparator = ' ' | ' - ' | ' / ';

export type CrmImportColumnComposition = {
  readonly columnIndexes: readonly number[];
  readonly separator: CrmImportNameSeparator;
};

export const CRM_IMPORT_NAME_SEPARATORS: readonly {
  readonly value: CrmImportNameSeparator;
  readonly label: string;
}[] = [
  { value: ' ', label: 'Space' },
  { value: ' - ', label: 'Hyphen (-)' },
  { value: ' / ', label: 'Slash (/)' },
];

export function composeImportColumnValues(
  cells: Readonly<Record<number, string>> | readonly string[],
  composition: CrmImportColumnComposition
): string {
  const parts: string[] = [];
  for (const index of composition.columnIndexes) {
    const raw =
      Array.isArray(cells) || typeof (cells as readonly string[])[0] === 'string'
        ? String((cells as readonly string[])[index] ?? '')
        : String((cells as Readonly<Record<number, string>>)[index] ?? '');
    const trimmed = raw.trim();
    if (trimmed) parts.push(trimmed);
  }
  return parts.join(composition.separator);
}

export function composeImportNameExample(
  sampleRows: readonly (readonly string[])[],
  composition: CrmImportColumnComposition,
  limit = 3
): readonly string[] {
  const out: string[] = [];
  for (const row of sampleRows) {
    if (out.length >= limit) break;
    const value = composeImportColumnValues(row, composition);
    if (value) out.push(value);
  }
  return out;
}

/** True when composition has at least one selected column. */
export function isCompositionConfigured(
  composition: CrmImportColumnComposition | null | undefined
): boolean {
  return composition != null && composition.columnIndexes.length > 0;
}
