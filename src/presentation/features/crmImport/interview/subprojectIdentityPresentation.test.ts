import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildSubprojectIdentityGuidanceView,
  buildSubprojectIdentityLiveExamples,
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
