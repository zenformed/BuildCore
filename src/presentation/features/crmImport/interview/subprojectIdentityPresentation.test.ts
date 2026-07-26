import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildSubprojectIdentityExampleTable,
  buildSubprojectIdentityGroups,
  buildSubprojectIdentityGuidanceView,
  buildSubprojectIdentityLiveExamples,
  buildSubprojectIdentityPreviewGroups,
  buildSubprojectIdentityPrimaryPreview,
  moveSubprojectIdentityColumn,
  moveSubprojectIdentityListRow,
  reorderSubprojectIdentityColumns,
  resolveSubprojectIdentityLayoutMode,
  shouldShowSubprojectIdentityCombineControl,
  subprojectIdentityColumnRowClass,
  toggleSubprojectIdentityColumn,
} from '@/presentation/features/crmImport/interview/subprojectIdentityPresentation';
import { createBuildCoreDashboardContent } from '@/platform/content/buildCoreDashboardContent';
import { resolveEntityTerminology } from '@/domain/buildcore/entityTerminology';

const COPY = {
  guidanceUniqueTitle: 'Good choice',
  guidanceUniqueBody: '',
  guidanceDuplicatesTitle: (count: number): string => `${count} duplicates`,
  guidanceDuplicatesBody: 'Add another column.',
  guidanceBlankTitle: 'Some blank',
  guidanceBlankBody: 'Fill values.',
  guidanceWeakSingleTitle: (header: string): string => `${header} alone may not work`,
  guidanceWeakSingleBody: 'Add Last Name.',
  warningWouldCreateTitle: (count: number): string => `BuildCore would create ${count} Subprojects`,
  warningWouldCreateBody: 'Nearly every row its own Subproject.',
};

describe('subprojectIdentityPresentation', () => {
  it('toggles selecting and deselecting identifying columns', () => {
    assert.deepEqual(toggleSubprojectIdentityColumn([], 0), [0]);
    assert.deepEqual(toggleSubprojectIdentityColumn([0], 1), [0, 1]);
    assert.deepEqual(toggleSubprojectIdentityColumn([0, 1], 0), [1]);
  });

  it('builds selected row class names', () => {
    assert.equal(
      subprojectIdentityColumnRowClass({
        selected: true,
        disabled: false,
        styles: { row: 'row', selected: 'selected', disabled: 'disabled' },
      }),
      'row selected'
    );
    assert.equal(
      subprojectIdentityColumnRowClass({
        selected: false,
        disabled: true,
        styles: { row: 'row', selected: 'selected', disabled: 'disabled' },
      }),
      'row disabled'
    );
  });

  it('reorders selected columns with move and list-row helpers', () => {
    assert.deepEqual(moveSubprojectIdentityColumn([0, 1, 2], 2, -1), [0, 2, 1]);
    assert.deepEqual(reorderSubprojectIdentityColumns([0, 1, 2], 2, 0), [2, 0, 1]);
    assert.deepEqual(
      moveSubprojectIdentityListRow({
        listOrder: [0, 1, 2],
        selectedIndexes: [0, 1, 2],
        index: 2,
        direction: -1,
      }),
      { listOrder: [0, 2, 1], selectedIndexes: [0, 2, 1] }
    );
  });

  it('hides separator for one column and shows it for multiple', () => {
    assert.equal(shouldShowSubprojectIdentityCombineControl(1), false);
    assert.equal(shouldShowSubprojectIdentityCombineControl(2), true);
  });

  it('updates primary preview for Space, Hyphen, and Slash composition', () => {
    const rows = [['Antoinette', 'Reese']];
    assert.equal(
      buildSubprojectIdentityPrimaryPreview(rows, { columnIndexes: [0, 1], separator: ' ' }),
      'Antoinette Reese'
    );
    assert.equal(
      buildSubprojectIdentityPrimaryPreview(rows, { columnIndexes: [0, 1], separator: ' - ' }),
      'Antoinette - Reese'
    );
    assert.equal(
      buildSubprojectIdentityPrimaryPreview(rows, { columnIndexes: [0, 1], separator: ' / ' }),
      'Antoinette / Reese'
    );
  });

  it('builds live example chips with remaining count and empty state', () => {
    const empty = buildSubprojectIdentityLiveExamples({
      dataRows: [['Ada', 'Lovelace']],
      composition: null,
    });
    assert.deepEqual(empty.examples, []);
    assert.equal(empty.remainingCount, 0);

    const many = buildSubprojectIdentityLiveExamples({
      dataRows: [
        ['A', '1'],
        ['B', '2'],
        ['C', '3'],
        ['D', '4'],
        ['E', '5'],
        ['F', '6'],
      ],
      composition: { columnIndexes: [0, 1], separator: ' ' },
      limit: 3,
    });
    assert.equal(many.examples.length, 3);
    assert.equal(many.remainingCount, 3);
  });

  it('maps guidance into unique, duplicate, blank, and weak-single views', () => {
    assert.equal(
      buildSubprojectIdentityGuidanceView(
        {
          kind: 'unique',
          severity: 'success',
          totalRows: 3,
          uniqueNameCount: 3,
          duplicateNameCount: 0,
          blankRowCount: 0,
          selectedHeaderLabel: 'A + B',
        },
        COPY
      )?.tone,
      'success'
    );
    assert.match(
      buildSubprojectIdentityGuidanceView(
        {
          kind: 'duplicates',
          severity: 'warning',
          totalRows: 4,
          uniqueNameCount: 2,
          duplicateNameCount: 2,
          blankRowCount: 0,
          selectedHeaderLabel: 'Unit',
        },
        COPY
      )?.title ?? '',
      /2 duplicates/
    );
    assert.equal(
      buildSubprojectIdentityGuidanceView(
        {
          kind: 'blank_names',
          severity: 'warning',
          totalRows: 3,
          uniqueNameCount: 2,
          duplicateNameCount: 0,
          blankRowCount: 1,
          selectedHeaderLabel: 'Unit',
        },
        COPY
      )?.kind,
      'blank_names'
    );
    assert.match(
      buildSubprojectIdentityGuidanceView(
        {
          kind: 'weak_single_column',
          severity: 'warning',
          totalRows: 3,
          uniqueNameCount: 2,
          duplicateNameCount: 1,
          blankRowCount: 0,
          selectedHeaderLabel: 'First Name',
        },
        COPY
      )?.title ?? '',
      /First Name/
    );
  });

  it('maps high-cardinality unique selections to a would-create warning', () => {
    const view = buildSubprojectIdentityGuidanceView(
      {
        kind: 'unique',
        severity: 'success',
        totalRows: 29,
        uniqueNameCount: 29,
        duplicateNameCount: 0,
        blankRowCount: 0,
        selectedHeaderLabel: 'First Name + Last Name',
      },
      COPY
    );
    assert.equal(view?.kind, 'would_create');
    assert.equal(view?.tone, 'warning');
    assert.match(view?.title ?? '', /29 Subprojects/);
  });

  it('groups rows by composed Subproject name and limits preview cards', () => {
    const dataRows = [
      ['Antoinette', 'Reese', 'a@example.com'],
      ['Tonya', 'Teton', 'b@example.com'],
      ['Emma', 'Finnsson', 'c@example.com'],
      ['Ada', 'Lovelace', 'd@example.com'],
    ];
    const composition = { columnIndexes: [0, 1] as const, separator: ' ' as const };
    const groups = buildSubprojectIdentityGroups({ dataRows, composition });
    assert.equal(groups.length, 4);
    assert.equal(groups[0]?.displayName, 'Antoinette Reese');
    assert.equal(groups[0]?.rowCount, 1);

    const preview = buildSubprojectIdentityPreviewGroups({
      groups,
      headers: ['First Name', 'Last Name', 'Email', 'Cell Phone'],
      dataRows: [
        ['Antoinette', 'Reese', 'a@example.com', '555-0100'],
        ['Tonya', 'Teton', 'b@example.com', '555-0101'],
        ['Emma', 'Finnsson', 'c@example.com', '555-0102'],
        ['Ada', 'Lovelace', 'd@example.com', '555-0103'],
      ],
      composition,
      limit: 3,
    });
    assert.equal(preview.visible.length, 3);
    assert.equal(preview.remainingCount, 1);
    assert.equal(preview.visible[0]?.displayName, 'Antoinette Reese');
    assert.deepEqual(preview.visible[0]?.companionLabels, []);
  });

  it('builds an example table with Subproject name and City (not Email)', () => {
    const table = buildSubprojectIdentityExampleTable({
      headers: ['First Name', 'Last Name', 'Email', 'City'],
      dataRows: [
        ['Antoinette', 'Reese', 'treese6@comcast.net', 'Austin'],
        ['Tonya', 'Teton', 'tteton@example.com', 'Dallas'],
      ],
      composition: { columnIndexes: [0, 1], separator: ' ' },
      composedNameLabel: 'Subproject name',
    });
    assert.equal(table.columns[0]?.label, 'Subproject name');
    assert.equal(table.columns[1]?.label, 'City');
    assert.equal(table.columns.some((column) => /email/i.test(column.label)), false);
    assert.equal(table.rows[0]?.cells[0], 'Antoinette Reese');
    assert.equal(table.rows[0]?.cells[1], 'Austin');
  });

  it('uses configured Subproject terminology in copy', () => {
    const copy = createBuildCoreDashboardContent(
      resolveEntityTerminology({ project: 'Job', subproject: 'Unit' })
    ).crm.spreadsheetImport.interview.subprojectIdentity;
    assert.match(copy.heading, /Unit/);
    assert.match(copy.subheading, /Unit/);
    assert.match(copy.previewHint, /Unit/);
  });

  it('maps stacked layout below the desktop breakpoint', () => {
    assert.equal(resolveSubprojectIdentityLayoutMode(1200), 'desktop');
    assert.equal(resolveSubprojectIdentityLayoutMode(800), 'stacked');
  });
});
