import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  composeImportColumnValues,
  composeImportNameExample,
  isCompositionConfigured,
} from './spreadsheetImportComposition';
import { recommendSpreadsheetStructures } from './spreadsheetImportStructureAnalysis';

describe('spreadsheetImportComposition', () => {
  it('composes a subproject name from one column', () => {
    assert.equal(composeImportColumnValues({ 0: 'Unit 101', 1: 'A' }, { columnIndexes: [0], separator: ' ' }), 'Unit 101');
  });

  it('composes a project name from multiple columns with separators', () => {
    const cells = { 0: 'Oak Ridge', 1: 'Building A', 2: '101' };
    assert.equal(
      composeImportColumnValues(cells, { columnIndexes: [0, 1], separator: ' - ' }),
      'Oak Ridge - Building A'
    );
    assert.equal(
      composeImportColumnValues(cells, { columnIndexes: [1, 2], separator: ' / ' }),
      'Building A / 101'
    );
  });

  it('composes First Name + Last Name into a contact-style label', () => {
    assert.equal(
      composeImportColumnValues(['Antoinette', 'Reese'], { columnIndexes: [0, 1], separator: ' ' }),
      'Antoinette Reese'
    );
  });

  it('skips blank parts when composing', () => {
    assert.equal(
      composeImportColumnValues({ 0: 'Ada', 1: '', 2: 'Lovelace' }, { columnIndexes: [0, 1, 2], separator: ' ' }),
      'Ada Lovelace'
    );
  });

  it('builds live examples from sample rows', () => {
    const examples = composeImportNameExample(
      [
        ['Oak', '101'],
        ['Oak', '102'],
        ['Pine', '1'],
      ],
      { columnIndexes: [0, 1], separator: ' - ' },
      2
    );
    assert.deepEqual(examples, ['Oak - 101', 'Oak - 102']);
  });

  it('reports whether a composition is configured', () => {
    assert.equal(isCompositionConfigured(null), false);
    assert.equal(isCompositionConfigured({ columnIndexes: [], separator: ' ' }), false);
    assert.equal(isCompositionConfigured({ columnIndexes: [2], separator: ' ' }), true);
  });
});

describe('spreadsheetImportStructureAnalysis', () => {
  it('recommends one-project structure for unique row identities', () => {
    const headers = ['Lead Name', 'Email', 'Phone'];
    const matrix = [
      headers,
      ['Ada', 'a@x.com', '1'],
      ['Grace', 'g@x.com', '2'],
      ['Katherine', 'k@x.com', '3'],
    ];
    const recs = recommendSpreadsheetStructures({ headers, matrix, headerRowIndex: 0 });
    assert.ok(recs.some((r) => r.kind === 'one_project'));
  });

  it('recommends multiple projects grouped by a repeating project-like column', () => {
    const headers = ['Complex Name', 'Unit', 'Address'];
    const matrix = [
      headers,
      ...Array.from({ length: 10 }, (_, i) => [
        i < 5 ? 'Oak Ridge' : 'Sunset Villas',
        `Unit ${i + 1}`,
        `${100 + i} Main`,
      ]),
    ];
    const recs = recommendSpreadsheetStructures({ headers, matrix, headerRowIndex: 0 });
    const multi = recs.find((r) => r.kind === 'multiple_by_column');
    assert.ok(multi);
    assert.equal(multi!.estimatedParentGroups, 2);
    assert.deepEqual(multi!.columnHeaders, ['Complex Name']);
  });
});
