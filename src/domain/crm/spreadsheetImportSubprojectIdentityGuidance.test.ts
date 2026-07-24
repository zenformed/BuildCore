import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { analyzeSubprojectIdentitySelection } from './spreadsheetImportSubprojectIdentityGuidance';

describe('spreadsheetImportSubprojectIdentityGuidance', () => {
  it('returns none when no columns are selected', () => {
    const result = analyzeSubprojectIdentitySelection({
      headers: ['First Name', 'Last Name'],
      dataRows: [
        ['Ada', 'Lovelace'],
        ['Grace', 'Hopper'],
      ],
      composition: null,
    });
    assert.equal(result.kind, 'none');
  });

  it('reports unique combinations as a success', () => {
    const result = analyzeSubprojectIdentitySelection({
      headers: ['First Name', 'Last Name'],
      dataRows: [
        ['Ada', 'Lovelace'],
        ['Grace', 'Hopper'],
        ['Katherine', 'Johnson'],
      ],
      composition: { columnIndexes: [0, 1], separator: ' ' },
    });
    assert.equal(result.kind, 'unique');
    assert.equal(result.severity, 'success');
    assert.equal(result.uniqueNameCount, 3);
    assert.equal(result.duplicateNameCount, 0);
  });

  it('counts duplicate Subproject names', () => {
    const result = analyzeSubprojectIdentitySelection({
      headers: ['Unit'],
      dataRows: [['101'], ['101'], ['102'], ['102'], ['103']],
      composition: { columnIndexes: [0], separator: ' ' },
    });
    assert.equal(result.kind, 'duplicates');
    assert.equal(result.duplicateNameCount, 2);
  });

  it('warns when some composed names are blank', () => {
    const result = analyzeSubprojectIdentitySelection({
      headers: ['Unit'],
      dataRows: [['101'], [''], ['102']],
      composition: { columnIndexes: [0], separator: ' ' },
    });
    assert.equal(result.kind, 'blank_names');
    assert.equal(result.blankRowCount, 1);
  });

  it('flags First Name alone when duplicates exist', () => {
    const result = analyzeSubprojectIdentitySelection({
      headers: ['First Name', 'Last Name'],
      dataRows: [
        ['John', 'Smith'],
        ['John', 'Doe'],
        ['Maria', 'Garcia'],
      ],
      composition: { columnIndexes: [0], separator: ' ' },
    });
    assert.equal(result.kind, 'weak_single_column');
    assert.match(result.selectedHeaderLabel, /First Name/i);
  });
});
