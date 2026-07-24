import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildProjectIdentityExampleTable,
  buildProjectIdentityPreviewGroups,
  buildProjectIdentityWarningView,
  projectIdentityColumnRowClass,
  shouldShowProjectIdentityCombineControl,
} from '@/presentation/features/crmImport/interview/projectIdentityPresentation';
import type { ProjectIdentityGuidance } from '@/domain/crm/spreadsheetImportProjectIdentityGuidance';

const COPY = {
  foundTitle: (count: number): string => `BuildCore found ${count} Projects`,
  foundSupporting: 'Based on the column or columns you selected.',
  moreProjects: (count: number): string => `+ ${count} more Projects`,
  composedNameColumn: 'Project name',
  exampleNameLabel: 'Example Project name:',
  warningHighCardinalityTitle: (count: number): string =>
    `BuildCore would create ${count.toLocaleString()} Projects`,
  warningHighCardinalityBody:
    'This selection appears to make nearly every spreadsheet row its own Project.',
  warningZipTitle: 'This looks like a ZIP / postal code column',
  warningZipBody: 'ZIP codes rarely identify Projects.',
  warningEmailTitle: 'This looks like an email column',
  warningEmailBody: 'Email addresses usually identify people, not Projects.',
  warningPhoneTitle: 'This looks like a phone column',
  warningPhoneBody: 'Phone numbers usually identify people, not Projects.',
  warningFirstNameTitle: 'This looks like a first-name column',
  warningFirstNameBody: 'First names rarely group rows into Projects.',
  warningUniqueIdTitle: 'This looks like a unique ID column',
  warningUniqueIdBody: 'Unique IDs often create one Project per row.',
  warningOneProjectTitle: 'No obvious Project column found',
  warningOneProjectBody:
    'This spreadsheet may contain subprojects for one Project rather than multiple Projects.',
  warningOneProjectAction: 'Go back and choose one Project',
};

describe('projectIdentityPresentation', () => {
  it('builds selected-order row class names for selected and unselected states', () => {
    assert.equal(
      projectIdentityColumnRowClass({
        selected: true,
        disabled: false,
        styles: { row: 'row', selected: 'selected', disabled: 'disabled' },
      }),
      'row selected'
    );
    assert.equal(
      projectIdentityColumnRowClass({
        selected: false,
        disabled: false,
        styles: { row: 'row', selected: 'selected', disabled: 'disabled' },
      }),
      'row'
    );
  });

  it('limits detected Project preview and reports remaining count', () => {
    const dataRowsBySourceIndex = new Map<number, readonly string[]>([
      [0, ['Oak Ridge', 'Sarah']],
      [1, ['Oak Ridge', 'John']],
      [2, ['Maple Grove', 'Amy']],
      [3, ['Sunset Villas', 'Lisa']],
      [4, ['Cedar Point', 'Mike']],
    ]);
    const result = buildProjectIdentityPreviewGroups({
      groups: [
        { groupKey: 'a', displayName: 'Oak Ridge', rowCount: 2, sourceRowIndexes: [0, 1] },
        { groupKey: 'b', displayName: 'Maple Grove', rowCount: 1, sourceRowIndexes: [2] },
        { groupKey: 'c', displayName: 'Sunset Villas', rowCount: 1, sourceRowIndexes: [3] },
        { groupKey: 'd', displayName: 'Cedar Point', rowCount: 1, sourceRowIndexes: [4] },
      ],
      dataRowsBySourceIndex,
      composition: { columnIndexes: [0], separator: ' ' },
      limit: 3,
    });
    assert.equal(result.visible.length, 3);
    assert.equal(result.remainingCount, 1);
    assert.equal(result.visible[0]?.displayName, 'Oak Ridge');
    assert.deepEqual(result.visible[0]?.sampleRowLabels, ['Oak Ridge', 'Oak Ridge']);
  });

  it('builds an example table with composed Project name first', () => {
    const table = buildProjectIdentityExampleTable({
      headers: ['Project Name', 'First Name', 'Last Name', 'Email'],
      dataRows: [
        ['Oak Ridge', 'Sarah', 'Lee', 'sarah@example.com'],
        ['Maple Grove', 'John', 'Kim', 'john@example.com'],
      ],
      composition: { columnIndexes: [0], separator: ' ' },
      composedNameLabel: 'Project name',
    });
    assert.equal(table.columns[0]?.label, 'Project name');
    assert.equal(table.columns[0]?.sourceIndex, null);
    assert.ok(table.columns.some((column) => column.label === 'First Name'));
    assert.equal(table.rows[0]?.cells[0], 'Oak Ridge');
  });

  it('maps high-cardinality guidance to a warning view', () => {
    const guidance: ProjectIdentityGuidance = {
      kind: 'high_cardinality',
      severity: 'warning',
      groupCount: 2201,
      totalRows: 2201,
      uniqueRatio: 1,
    };
    const view = buildProjectIdentityWarningView(guidance, COPY);
    assert.ok(view);
    assert.equal(view?.kind, 'high_cardinality');
    assert.match(view?.title ?? '', /2,201/);
    assert.equal(view?.showChooseOneAction, false);
  });

  it('maps likely-one-project guidance to an actionable warning', () => {
    const guidance: ProjectIdentityGuidance = {
      kind: 'likely_one_project_sheet',
      severity: 'warning',
      groupCount: 40,
      totalRows: 50,
      uniqueRatio: 0.8,
    };
    const view = buildProjectIdentityWarningView(guidance, COPY);
    assert.ok(view);
    assert.equal(view?.showChooseOneAction, true);
    assert.equal(view?.actionLabel, COPY.warningOneProjectAction);
  });

  it('returns null warning view when guidance is none', () => {
    const guidance: ProjectIdentityGuidance = {
      kind: 'none',
      severity: 'none',
      groupCount: 3,
      totalRows: 20,
      uniqueRatio: 0.15,
    };
    assert.equal(buildProjectIdentityWarningView(guidance, COPY), null);
  });

  it('shows combine control only when multiple columns are selected', () => {
    assert.equal(shouldShowProjectIdentityCombineControl(0), false);
    assert.equal(shouldShowProjectIdentityCombineControl(1), false);
    assert.equal(shouldShowProjectIdentityCombineControl(2), true);
  });
});
