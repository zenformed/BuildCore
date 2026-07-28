import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { resolveEntityTerminology } from '@/domain/buildcore/entityTerminology';
import { createBuildCoreDashboardContent } from '@/platform/content/buildCoreDashboardContent';
import {
  adjacentProjectHeaderGroupId,
  buildHeaderRowProjectGroups,
  buildProjectHeaderRowPreviewModels,
  buildProjectHeaderRowsSummary,
  buildProjectHeaderSpreadsheetRowHighlight,
  canContinueProjectHeaderRows,
  findProjectHeaderGroupForRow,
  headerRowGroupsToWorksheetConfigs,
  initialProjectHeaderRowSelection,
  projectHeaderGroupAccentIndex,
  projectHeaderSpreadsheetRowClassNames,
  resolveActiveGroupId,
  resolveProjectHeaderGroupCardStatus,
  shouldToggleProjectHeaderOnGroupCardClick,
  shouldToggleProjectHeaderOnSpreadsheetRowClick,
  toggleProjectHeaderRowSelection,
} from '@/presentation/features/crmImport/interview/projectHeaderRowsPresentation';
import { buildHeaderRowImportSource } from '@/presentation/features/crmImport/interview/buildHeaderRowImportSource';
import {
  clearDownstreamAfterHeaderChange,
  clearDownstreamAfterProjectHeaderChange,
  createInitialInterviewState,
  applyMultiProjectOrganization,
  applyStructureChoice,
  goInterviewBack,
  goInterviewForward,
} from '@/presentation/features/crmImport/interview/interviewState';

const SAMPLE: string[][] = [
  ['Oak Ridge Apartments', '', '', ''],
  ['Unit', 'Status', 'Contact', 'Phone'],
  ['101', 'Active', 'Sarah', '555-0101'],
  ['102', 'Pending', 'John', '555-0102'],
  ['103', 'Active', 'Amy', '555-0103'],
  ['Maple Grove', '', '', ''],
  ['201', 'Active', 'Lisa', '555-0201'],
  ['202', 'Active', 'Mike', '555-0202'],
];

describe('projectHeaderRowsPresentation', () => {
  it('preselects suggested Project header rows', () => {
    assert.deepEqual(initialProjectHeaderRowSelection(SAMPLE, 1), [0, 5]);
  });

  it('supports adding and removing Project header selections', () => {
    let selected = initialProjectHeaderRowSelection(SAMPLE, 1);
    selected = toggleProjectHeaderRowSelection(selected, 3, true);
    assert.ok(selected.includes(3));
    selected = toggleProjectHeaderRowSelection(selected, 0, false);
    assert.ok(!selected.includes(0));
  });

  it('updates live group boundaries when selection changes', () => {
    const withBoth = buildHeaderRowProjectGroups({
      matrix: SAMPLE,
      columnHeaderRowIndex: 1,
      selectedHeaderRowIndexes: [0, 5],
    });
    assert.equal(withBoth[0]!.childRowIndexes.length, 3);

    const mapleOnly = buildHeaderRowProjectGroups({
      matrix: SAMPLE,
      columnHeaderRowIndex: 1,
      selectedHeaderRowIndexes: [5],
    });
    assert.equal(mapleOnly.length, 1);
    assert.equal(mapleOnly[0]!.displayName, 'Maple Grove');
  });

  it('maps groups into worksheet Project configs for resolution reuse', () => {
    const groups = buildHeaderRowProjectGroups({
      matrix: SAMPLE,
      columnHeaderRowIndex: 1,
      selectedHeaderRowIndexes: [0, 5],
      nameOverrides: { 0: 'Oak Custom' },
    });
    const configs = headerRowGroupsToWorksheetConfigs(groups, 4);
    assert.equal(configs.length, 2);
    assert.equal(configs[0]!.projectName, 'Oak Custom');
    assert.equal(configs[0]!.worksheetId, 'hr:0');
    assert.equal(configs[0]!.dataRowCount, 3);
  });

  it('blocks continue until unassigned rows are resolved', () => {
    assert.equal(
      canContinueProjectHeaderRows({
        matrix: SAMPLE,
        columnHeaderRowIndex: 1,
        selectedHeaderRowIndexes: [5],
      }),
      false
    );
    assert.equal(
      canContinueProjectHeaderRows({
        matrix: SAMPLE,
        columnHeaderRowIndex: 1,
        selectedHeaderRowIndexes: [5],
        excludedRowIndexes: [0, 2, 3, 4],
      }),
      true
    );
  });
});

describe('buildHeaderRowImportSource', () => {
  it('imports child rows only and injects Project names', () => {
    const groups = buildHeaderRowProjectGroups({
      matrix: SAMPLE,
      columnHeaderRowIndex: 1,
      selectedHeaderRowIndexes: [0, 5],
    });
    const configs = headerRowGroupsToWorksheetConfigs(groups, 4);
    const source = buildHeaderRowImportSource({
      matrix: SAMPLE,
      columnHeaderRowIndex: 1,
      sheetName: 'Sheet1',
      groups,
      configs,
      resolutions: {
        'hr:0': {
          kind: 'create_new',
          existingProjectId: null,
          existingProjectLabel: null,
          confirmed: true,
        },
        'hr:5': {
          kind: 'create_new',
          existingProjectId: null,
          existingProjectLabel: null,
          confirmed: true,
        },
      },
    });

    assert.deepEqual([...source.headers], ['Unit', 'Status', 'Contact', 'Phone']);
    assert.equal(source.rows.length, 5);
    assert.ok(source.rows.every((row) => row.sourceRowIndex !== 0 && row.sourceRowIndex !== 5));
    assert.equal(source.rows[0]!.cells[4], 'Oak Ridge Apartments');
    assert.equal(source.rows[3]!.cells[4], 'Maple Grove');
  });

  it('skips groups marked skip and never treats header rows as Subprojects', () => {
    const groups = buildHeaderRowProjectGroups({
      matrix: SAMPLE,
      columnHeaderRowIndex: 1,
      selectedHeaderRowIndexes: [0, 5],
    });
    const configs = headerRowGroupsToWorksheetConfigs(groups, 4).map((config) =>
      config.worksheetId === 'hr:5' ? { ...config, included: false } : config
    );
    const source = buildHeaderRowImportSource({
      matrix: SAMPLE,
      columnHeaderRowIndex: 1,
      sheetName: 'Sheet1',
      groups,
      configs,
      resolutions: {
        'hr:0': {
          kind: 'create_new',
          existingProjectId: null,
          existingProjectLabel: null,
          confirmed: true,
        },
        'hr:5': {
          kind: 'skip',
          existingProjectId: null,
          existingProjectLabel: null,
          confirmed: true,
        },
      },
    });
    assert.equal(source.rows.length, 3);
    assert.ok(source.rows.every((row) => row.sourceRowIndex < 5));
  });
});

describe('header_rows interview state invalidation', () => {
  it('preserves Back/forward Project-header selection state', () => {
    let state = createInitialInterviewState({ launchMode: 'master_hierarchy' });
    state = applyStructureChoice(state, 'multiple_projects');
    state = applyMultiProjectOrganization(state, 'header_rows');
    state = { ...state, screen: 'multi_project_organization' };
    state = goInterviewForward(state); // header
    state = goInterviewForward(state); // project_header_rows
    state = {
      ...state,
      projectHeaderRowIndexes: [0, 5],
      projectHeaderNameOverrides: { 0: 'Oak' },
    };
    state = goInterviewBack(state);
    assert.equal(state.screen, 'header');
    state = goInterviewForward(state);
    assert.equal(state.screen, 'project_header_rows');
    assert.deepEqual(state.projectHeaderRowIndexes, [0, 5]);
    assert.equal(state.projectHeaderNameOverrides[0], 'Oak');
  });

  it('clears Project-header detection when the column-header row changes', () => {
    let state = createInitialInterviewState({ launchMode: 'master_hierarchy' });
    state = applyStructureChoice(state, 'multiple_projects');
    state = applyMultiProjectOrganization(state, 'header_rows');
    state = {
      ...state,
      projectHeaderRowIndexes: [0, 5],
      projectHeaderNameOverrides: { 0: 'Oak' },
      worksheetProjects: [
        {
          worksheetId: 'hr:0',
          worksheetName: 'Oak',
          included: true,
          projectName: 'Oak',
          headerRowIndex: 0,
          dataRowCount: 3,
          columnCount: 4,
        },
      ],
    };
    state = clearDownstreamAfterHeaderChange(state);
    assert.equal(state.multiProjectOrganization, 'header_rows');
    assert.equal(state.projectHeaderRowIndexes, null);
    assert.deepEqual(state.projectHeaderNameOverrides, {});
    assert.equal(state.worksheetProjects, null);
  });

  it('clears destination resolutions when Project headers change', () => {
    let state = createInitialInterviewState({ launchMode: 'master_hierarchy' });
    state = applyMultiProjectOrganization(
      applyStructureChoice(state, 'multiple_projects'),
      'header_rows'
    );
    state = {
      ...state,
      projectHeaderRowIndexes: [0, 5],
      worksheetProjects: [
        {
          worksheetId: 'hr:0',
          worksheetName: 'Oak',
          included: true,
          projectName: 'Oak',
          headerRowIndex: 0,
          dataRowCount: 3,
          columnCount: 4,
        },
      ],
      worksheetResolutions: {
        'hr:0': {
          kind: 'create_new',
          existingProjectId: null,
          existingProjectLabel: null,
          confirmed: true,
        },
      },
      subprojectComposition: { columnIndexes: [0], separator: ' ' },
    };
    state = clearDownstreamAfterProjectHeaderChange(state);
    assert.equal(state.worksheetProjects, null);
    assert.equal(state.worksheetResolutions, null);
    assert.equal(state.subprojectComposition, null);
  });
});

describe('projectHeaderRows UI polish presentation', () => {
  it('uses confirmation heading and Projects-to-import panel copy with terminology', () => {
    const copy = createBuildCoreDashboardContent(
      resolveEntityTerminology({ project: 'Job', subproject: 'Unit' })
    ).crm.spreadsheetImport.interview.projectHeaderRows;
    assert.match(copy.heading, /Confirm your Job sections/i);
    assert.match(copy.hint, /start each Job/i);
    assert.match(copy.groupsHeading, /Jobs to import/i);
    assert.match(copy.selectedAsProject, /Job header/i);
    assert.match(copy.summaryProjectGroups(3), /3 Job groups detected/i);
    assert.match(copy.summarySubprojects(29), /29 Units/i);
    assert.match(copy.summaryUnassigned(0), /0 unassigned rows/i);
    assert.match(copy.unassignedTableWarning(4), /not assigned to a Job section/i);
    assert.match(copy.importSummary('Atlanta', 7), /Will create Job .+Atlanta.+ with 7 Units/i);
    assert.equal(copy.statusReady, 'Ready');
    assert.equal(copy.previewLabel, 'Preview');
  });

  it('computes summary counts for groups, Subprojects, and unassigned rows', () => {
    const ok = buildProjectHeaderRowsSummary({
      matrix: SAMPLE,
      columnHeaderRowIndex: 1,
      selectedHeaderRowIndexes: [0, 5],
    });
    assert.deepEqual(ok, {
      projectGroupCount: 2,
      subprojectCount: 5,
      unassignedRowCount: 0,
    });

    const unassigned = buildProjectHeaderRowsSummary({
      matrix: SAMPLE,
      columnHeaderRowIndex: 1,
      selectedHeaderRowIndexes: [5],
    });
    assert.equal(unassigned.projectGroupCount, 1);
    assert.equal(unassigned.subprojectCount, 2);
    assert.equal(unassigned.unassignedRowCount, 4);
  });

  it('styles Project-header rows distinctly from ordinary and column-header rows', () => {
    const groups = buildHeaderRowProjectGroups({
      matrix: SAMPLE,
      columnHeaderRowIndex: 1,
      selectedHeaderRowIndexes: [0, 5],
    });
    const oak = groups[0]!;

    const header = buildProjectHeaderSpreadsheetRowHighlight({
      rowIndex: 0,
      columnHeaderRowIndex: 1,
      selectedHeaderRowIndexes: [0, 5],
      unassignedRowIndexes: [],
      activeGroup: oak,
      hoverGroup: null,
      groups,
    });
    assert.equal(header.isProjectHeader, true);
    assert.equal(header.accentIndex, 0);
    assert.ok(projectHeaderSpreadsheetRowClassNames(header).includes('projectHeaderSectionHeaderRow'));
    assert.ok(projectHeaderSpreadsheetRowClassNames(header).includes('projectHeaderAccent0'));
    assert.ok(projectHeaderSpreadsheetRowClassNames(header).includes('projectHeaderGroupActive'));

    const ordinary = buildProjectHeaderSpreadsheetRowHighlight({
      rowIndex: 3,
      columnHeaderRowIndex: 1,
      selectedHeaderRowIndexes: [0, 5],
      unassignedRowIndexes: [],
      activeGroup: null,
      hoverGroup: null,
      groups,
    });
    assert.equal(ordinary.isProjectHeader, false);
    assert.equal(ordinary.accentIndex, 0);
    assert.ok(
      !projectHeaderSpreadsheetRowClassNames(ordinary).includes('projectHeaderSectionHeaderRow')
    );
    assert.ok(projectHeaderSpreadsheetRowClassNames(ordinary).includes('projectHeaderGroupChild'));
    assert.ok(projectHeaderSpreadsheetRowClassNames(ordinary).includes('projectHeaderAccent0'));

    const mapleChild = buildProjectHeaderSpreadsheetRowHighlight({
      rowIndex: 6,
      columnHeaderRowIndex: 1,
      selectedHeaderRowIndexes: [0, 5],
      unassignedRowIndexes: [],
      activeGroup: null,
      hoverGroup: null,
      groups,
    });
    assert.equal(mapleChild.accentIndex, 1);
    assert.ok(projectHeaderSpreadsheetRowClassNames(mapleChild).includes('projectHeaderAccent1'));

    const column = buildProjectHeaderSpreadsheetRowHighlight({
      rowIndex: 1,
      columnHeaderRowIndex: 1,
      selectedHeaderRowIndexes: [0, 5],
      unassignedRowIndexes: [],
      activeGroup: null,
      hoverGroup: null,
      groups,
    });
    assert.equal(column.kind, 'column_header');
    assert.ok(
      projectHeaderSpreadsheetRowClassNames(column).includes('projectHeaderColumnHeaderRow')
    );
  });

  it('does not toggle checkbox selection when focusing a group card or spreadsheet row', () => {
    assert.equal(shouldToggleProjectHeaderOnGroupCardClick(), false);
    assert.equal(shouldToggleProjectHeaderOnSpreadsheetRowClick(), false);
  });

  it('maps spreadsheet row clicks to the matching Project group for synchronized selection', () => {
    const groups = buildHeaderRowProjectGroups({
      matrix: SAMPLE,
      columnHeaderRowIndex: 1,
      selectedHeaderRowIndexes: [0, 5],
    });
    assert.equal(findProjectHeaderGroupForRow(groups, 0)?.groupId, 'hr:0');
    assert.equal(findProjectHeaderGroupForRow(groups, 3)?.groupId, 'hr:0');
    assert.equal(findProjectHeaderGroupForRow(groups, 5)?.groupId, 'hr:5');
    assert.equal(findProjectHeaderGroupForRow(groups, 1), null);
  });

  it('highlights the active group header and child range, and updates when switching groups', () => {
    const groups = buildHeaderRowProjectGroups({
      matrix: SAMPLE,
      columnHeaderRowIndex: 1,
      selectedHeaderRowIndexes: [0, 5],
    });
    const oak = groups[0]!;
    const maple = groups[1]!;

    const oakChild = buildProjectHeaderSpreadsheetRowHighlight({
      rowIndex: 2,
      columnHeaderRowIndex: 1,
      selectedHeaderRowIndexes: [0, 5],
      unassignedRowIndexes: [],
      activeGroup: oak,
      hoverGroup: null,
      groups,
    });
    assert.equal(oakChild.isActiveChild, true);
    assert.ok(
      projectHeaderSpreadsheetRowClassNames(oakChild).includes('projectHeaderGroupActive')
    );
    assert.ok(projectHeaderSpreadsheetRowClassNames(oakChild).includes('projectHeaderGroupChild'));

    const mapleOutsideOak = buildProjectHeaderSpreadsheetRowHighlight({
      rowIndex: 6,
      columnHeaderRowIndex: 1,
      selectedHeaderRowIndexes: [0, 5],
      unassignedRowIndexes: [],
      activeGroup: oak,
      hoverGroup: null,
      groups,
    });
    assert.equal(mapleOutsideOak.inActiveGroup, false);

    assert.equal(
      resolveActiveGroupId({ groups, preferredGroupId: 'hr:5' }),
      'hr:5'
    );
    const mapleChild = buildProjectHeaderSpreadsheetRowHighlight({
      rowIndex: 7,
      columnHeaderRowIndex: 1,
      selectedHeaderRowIndexes: [0, 5],
      unassignedRowIndexes: [],
      activeGroup: maple,
      hoverGroup: null,
      groups,
    });
    assert.equal(mapleChild.isActiveChild, true);
    assert.equal(mapleChild.isGroupLast, true);
    assert.equal(mapleChild.accentIndex, 1);
  });

  it('recomputes groups when a Project header is deselected and keeps edited names', () => {
    let selected = [0, 5] as readonly number[];
    selected = toggleProjectHeaderRowSelection(selected, 0, false);
    const models = buildProjectHeaderRowPreviewModels({
      matrix: SAMPLE,
      columnHeaderRowIndex: 1,
      selectedHeaderRowIndexes: selected,
      nameOverrides: { 5: 'Maple Custom' },
    });
    assert.equal(models.length, 1);
    assert.equal(models[0]!.group.displayName, 'Maple Custom');
    assert.deepEqual(models[0]!.group.childRowIndexes, [6, 7]);
  });

  it('reports unassigned rows and applies unassigned styling', () => {
    const summary = buildProjectHeaderRowsSummary({
      matrix: SAMPLE,
      columnHeaderRowIndex: 1,
      selectedHeaderRowIndexes: [5],
    });
    assert.equal(summary.unassignedRowCount, 4);

    const highlight = buildProjectHeaderSpreadsheetRowHighlight({
      rowIndex: 0,
      columnHeaderRowIndex: 1,
      selectedHeaderRowIndexes: [5],
      unassignedRowIndexes: [0, 2, 3, 4],
      activeGroup: null,
      hoverGroup: null,
      groups: buildHeaderRowProjectGroups({
        matrix: SAMPLE,
        columnHeaderRowIndex: 1,
        selectedHeaderRowIndexes: [5],
      }),
    });
    assert.equal(highlight.isUnassigned, true);
    assert.ok(
      projectHeaderSpreadsheetRowClassNames(highlight).includes('projectHeaderUnassignedDataRow')
    );
  });

  it('supports keyboard navigation between group cards', () => {
    const groups = [
      { groupId: 'hr:0' },
      { groupId: 'hr:5' },
    ];
    assert.equal(adjacentProjectHeaderGroupId(groups, 'hr:0', 'next'), 'hr:5');
    assert.equal(adjacentProjectHeaderGroupId(groups, 'hr:5', 'previous'), 'hr:0');
    assert.equal(adjacentProjectHeaderGroupId(groups, 'hr:0', 'previous'), 'hr:0');
  });

  it('defines light and dark theme styles for Project-header accents', () => {
    const cssPath = path.join(
      process.cwd(),
      'src/presentation/components/CrmImport/SpreadsheetImportWizard.module.css'
    );
    const css = readFileSync(cssPath, 'utf8');
    assert.match(css, /\.projectHeaderSectionHeaderRow/);
    assert.match(css, /\.projectHeaderGroupChild/);
    assert.match(css, /\.projectHeaderAccent0/);
    assert.match(css, /\.projectHeaderAccent7/);
    assert.match(css, /--ph-group-accent/);
    assert.match(css, /\.projectHeaderSummaryUnassignedWarn/);
    assert.match(css, /\[data-theme='dark'\][\s\S]*projectHeaderSectionHeaderRow/);
    assert.match(css, /\[data-theme='dark'\][\s\S]*projectHeaderGroupCardSelected/);
    assert.match(css, /--color-success/);
    assert.match(css, /projectHeaderGroupLast/);
  });

  it('assigns rotating accent indexes deterministically and wraps the palette', () => {
    assert.equal(projectHeaderGroupAccentIndex(0), 0);
    assert.equal(projectHeaderGroupAccentIndex(1), 1);
    assert.equal(projectHeaderGroupAccentIndex(7), 7);
    assert.equal(projectHeaderGroupAccentIndex(8), 0);
    assert.equal(projectHeaderGroupAccentIndex(9), 1);
  });

  it('does not apply hover group accent classes (standard table hover only)', () => {
    const groups = buildHeaderRowProjectGroups({
      matrix: SAMPLE,
      columnHeaderRowIndex: 1,
      selectedHeaderRowIndexes: [0, 5],
    });
    const highlight = buildProjectHeaderSpreadsheetRowHighlight({
      rowIndex: 2,
      columnHeaderRowIndex: 1,
      selectedHeaderRowIndexes: [0, 5],
      unassignedRowIndexes: [],
      activeGroup: null,
      hoverGroup: groups[0]!,
      groups,
    });
    const classes = projectHeaderSpreadsheetRowClassNames(highlight);
    assert.ok(!classes.some((name) => name.includes('Hover')));
  });

  it('includes overflow preview counts for large groups', () => {
    const models = buildProjectHeaderRowPreviewModels({
      matrix: SAMPLE,
      columnHeaderRowIndex: 1,
      selectedHeaderRowIndexes: [0, 5],
    });
    assert.equal(models[0]!.childPreviews.length, 3);
    assert.equal(models[0]!.childOverflowCount, 0);
    assert.equal(models[0]!.childCount, 3);
    assert.equal(models[0]!.status, 'ready');
  });

  it('resolves card status from existing validation signals', () => {
    assert.equal(
      resolveProjectHeaderGroupCardStatus({
        displayName: '',
        childCount: 3,
        unassignedRowCount: 0,
      }),
      'invalid_name'
    );
    assert.equal(
      resolveProjectHeaderGroupCardStatus({
        displayName: 'Atlanta',
        childCount: 3,
        unassignedRowCount: 4,
      }),
      'unassigned_rows'
    );
    assert.equal(
      resolveProjectHeaderGroupCardStatus({
        displayName: 'Atlanta',
        childCount: 0,
        unassignedRowCount: 0,
      }),
      'needs_review'
    );
    assert.equal(
      resolveProjectHeaderGroupCardStatus({
        displayName: 'Atlanta',
        childCount: 7,
        unassignedRowCount: 0,
      }),
      'ready'
    );
  });

  it('prefers combined child preview labels over a single cell', () => {
    const matrix = [
      ['Atlanta', '', ''],
      ['First', 'Last', 'Phone'],
      ['Jessica', 'Williams', '555-0100'],
      ['Olivia', 'Smith', '555-0101'],
    ];
    const models = buildProjectHeaderRowPreviewModels({
      matrix,
      columnHeaderRowIndex: 1,
      selectedHeaderRowIndexes: [0],
    });
    assert.equal(models[0]!.childPreviews[0], 'Jessica Williams');
    assert.equal(models[0]!.childPreviews[1], 'Olivia Smith');
    assert.match(
      createBuildCoreDashboardContent(
        resolveEntityTerminology({ project: 'Project', subproject: 'Subproject' })
      ).crm.spreadsheetImport.interview.projectHeaderRows.importSummary('Atlanta', 2),
      /Will create Project .+Atlanta.+ with 2 subprojects/i
    );
  });
});
