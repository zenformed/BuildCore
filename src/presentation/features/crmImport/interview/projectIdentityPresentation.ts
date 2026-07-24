/**
 * Pure helpers for the Project identity interview screen presentation.
 */

import {
  composeImportColumnValues,
  type CrmImportColumnComposition,
} from '@/domain/crm/spreadsheetImportComposition';
import type {
  ProjectIdentityGuidance,
  ProjectIdentityGuidanceKind,
} from '@/domain/crm/spreadsheetImportProjectIdentityGuidance';

export const PROJECT_IDENTITY_PREVIEW_LIMIT = 3;
export const PROJECT_IDENTITY_EXAMPLE_ROW_LIMIT = 4;
export const PROJECT_IDENTITY_SAMPLE_ROWS_PER_GROUP = 3;

export type ProjectIdentityPreviewGroup = {
  readonly key: string;
  readonly displayName: string;
  readonly rowCount: number;
  readonly sampleRowLabels: readonly string[];
};

export type ProjectIdentityExampleColumn = {
  readonly key: string;
  readonly label: string;
  readonly sourceIndex: number | null; // null = composed project name
};

export type ProjectIdentityExampleRow = {
  readonly key: string;
  readonly cells: readonly string[];
};

export type ProjectIdentityWarningView = {
  readonly kind: Exclude<ProjectIdentityGuidanceKind, 'none'>;
  readonly title: string;
  readonly body: string;
  readonly actionLabel: string | null;
  readonly showChooseOneAction: boolean;
};

export type ProjectIdentityCopy = {
  readonly foundTitle: (count: number) => string;
  readonly foundSupporting: string;
  readonly moreProjects: (count: number) => string;
  readonly composedNameColumn: string;
  readonly exampleNameLabel: string;
  readonly warningHighCardinalityTitle: (count: number) => string;
  readonly warningHighCardinalityBody: string;
  readonly warningZipTitle: string;
  readonly warningZipBody: string;
  readonly warningEmailTitle: string;
  readonly warningEmailBody: string;
  readonly warningPhoneTitle: string;
  readonly warningPhoneBody: string;
  readonly warningFirstNameTitle: string;
  readonly warningFirstNameBody: string;
  readonly warningUniqueIdTitle: string;
  readonly warningUniqueIdBody: string;
  readonly warningOneProjectTitle: string;
  readonly warningOneProjectBody: string;
  readonly warningOneProjectAction: string;
};

function pickExampleColumnIndexes(headers: readonly string[]): number[] {
  const patterns: RegExp[] = [
    /\b(first\s*name|firstname|fname|given)\b/i,
    /\b(last\s*name|lastname|lname|surname)\b/i,
    /\b(e[\s-]?mail)\b/i,
    /\b(city)\b/i,
    /\b(phone|mobile)\b/i,
  ];
  const picked: number[] = [];
  for (const pattern of patterns) {
    const index = headers.findIndex((header, i) => pattern.test(header) && !picked.includes(i));
    if (index >= 0) picked.push(index);
    if (picked.length >= 3) break;
  }
  if (picked.length === 0) {
    for (let i = 0; i < headers.length && picked.length < 3; i += 1) {
      picked.push(i);
    }
  }
  return picked;
}

export function buildProjectIdentityPreviewGroups(input: {
  readonly groups: readonly {
    readonly groupKey: string;
    readonly displayName: string;
    readonly rowCount: number;
    readonly sourceRowIndexes: readonly number[];
  }[];
  readonly dataRowsBySourceIndex: ReadonlyMap<number, readonly string[]>;
  readonly composition: CrmImportColumnComposition;
  readonly limit?: number;
}): {
  readonly visible: readonly ProjectIdentityPreviewGroup[];
  readonly remainingCount: number;
} {
  const limit = input.limit ?? PROJECT_IDENTITY_PREVIEW_LIMIT;
  const visible = input.groups.slice(0, limit).map((group) => {
    const sampleRowLabels: string[] = [];
    for (const sourceRowIndex of group.sourceRowIndexes) {
      if (sampleRowLabels.length >= PROJECT_IDENTITY_SAMPLE_ROWS_PER_GROUP) break;
      const row = input.dataRowsBySourceIndex.get(sourceRowIndex);
      if (row == null) continue;
      const label = composeImportColumnValues(row, input.composition).trim();
      if (label) sampleRowLabels.push(label);
    }
    return {
      key: group.groupKey,
      displayName: group.displayName,
      rowCount: group.rowCount,
      sampleRowLabels,
    };
  });
  return {
    visible,
    remainingCount: Math.max(0, input.groups.length - visible.length),
  };
}

export function buildProjectIdentityExampleTable(input: {
  readonly headers: readonly string[];
  readonly dataRows: readonly (readonly string[])[];
  readonly composition: CrmImportColumnComposition;
  readonly composedNameLabel: string;
  readonly limit?: number;
}): {
  readonly columns: readonly ProjectIdentityExampleColumn[];
  readonly rows: readonly ProjectIdentityExampleRow[];
} {
  const limit = input.limit ?? PROJECT_IDENTITY_EXAMPLE_ROW_LIMIT;
  const extraIndexes = pickExampleColumnIndexes(input.headers).filter(
    (index) => !input.composition.columnIndexes.includes(index)
  );
  const columns: ProjectIdentityExampleColumn[] = [
    {
      key: 'composed',
      label: input.composedNameLabel,
      sourceIndex: null,
    },
    ...extraIndexes.map((sourceIndex) => ({
      key: `col-${sourceIndex}`,
      label: input.headers[sourceIndex] ?? `Column ${sourceIndex + 1}`,
      sourceIndex,
    })),
  ];

  const rows: ProjectIdentityExampleRow[] = [];
  for (let i = 0; i < input.dataRows.length && rows.length < limit; i += 1) {
    const row = input.dataRows[i]!;
    const composed = composeImportColumnValues(row, input.composition).trim();
    if (!composed) continue;
    rows.push({
      key: `row-${i}`,
      cells: [
        composed,
        ...extraIndexes.map((sourceIndex) => String(row[sourceIndex] ?? '').trim()),
      ],
    });
  }

  return { columns, rows };
}

export function buildProjectIdentityWarningView(
  guidance: ProjectIdentityGuidance,
  copy: ProjectIdentityCopy
): ProjectIdentityWarningView | null {
  if (guidance.severity === 'none' || guidance.kind === 'none') return null;

  switch (guidance.kind) {
    case 'high_cardinality':
      return {
        kind: guidance.kind,
        title: copy.warningHighCardinalityTitle(guidance.groupCount),
        body: copy.warningHighCardinalityBody,
        actionLabel: null,
        showChooseOneAction: false,
      };
    case 'looks_like_zip':
      return {
        kind: guidance.kind,
        title: copy.warningZipTitle,
        body: copy.warningZipBody,
        actionLabel: null,
        showChooseOneAction: false,
      };
    case 'looks_like_email':
      return {
        kind: guidance.kind,
        title: copy.warningEmailTitle,
        body: copy.warningEmailBody,
        actionLabel: null,
        showChooseOneAction: false,
      };
    case 'looks_like_phone':
      return {
        kind: guidance.kind,
        title: copy.warningPhoneTitle,
        body: copy.warningPhoneBody,
        actionLabel: null,
        showChooseOneAction: false,
      };
    case 'looks_like_first_name':
      return {
        kind: guidance.kind,
        title: copy.warningFirstNameTitle,
        body: copy.warningFirstNameBody,
        actionLabel: null,
        showChooseOneAction: false,
      };
    case 'looks_like_unique_id':
      return {
        kind: guidance.kind,
        title: copy.warningUniqueIdTitle,
        body: copy.warningUniqueIdBody,
        actionLabel: null,
        showChooseOneAction: false,
      };
    case 'likely_one_project_sheet':
      return {
        kind: guidance.kind,
        title: copy.warningOneProjectTitle,
        body: copy.warningOneProjectBody,
        actionLabel: copy.warningOneProjectAction,
        showChooseOneAction: true,
      };
    default:
      return null;
  }
}

export function shouldShowProjectIdentityCombineControl(selectedColumnCount: number): boolean {
  return selectedColumnCount >= 2;
}

export function projectIdentityColumnRowClass(input: {
  readonly selected: boolean;
  readonly disabled: boolean;
  readonly styles: {
    readonly row: string;
    readonly selected: string;
    readonly disabled: string;
  };
}): string {
  return [
    input.styles.row,
    input.selected ? input.styles.selected : '',
    input.disabled ? input.styles.disabled : '',
  ]
    .filter(Boolean)
    .join(' ');
}
