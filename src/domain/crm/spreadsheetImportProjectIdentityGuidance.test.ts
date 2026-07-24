import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { analyzeProjectIdentitySelection } from './spreadsheetImportProjectIdentityGuidance';

describe('analyzeProjectIdentitySelection', () => {
  it('returns none when no columns are selected', () => {
    const result = analyzeProjectIdentitySelection({
      headers: ['Project Name'],
      dataRows: [['Oak Ridge']],
      composition: null,
    });
    assert.equal(result.kind, 'none');
    assert.equal(result.severity, 'none');
  });

  it('flags nearly one-project-per-row selections as high cardinality', () => {
    const rows = Array.from({ length: 20 }, (_, i) => [`Code-${i}`, 'shared']);
    const result = analyzeProjectIdentitySelection({
      headers: ['Lead Code', 'City'],
      dataRows: rows,
      composition: { columnIndexes: [0], separator: ' ' },
    });
    assert.equal(result.kind, 'high_cardinality');
    assert.equal(result.severity, 'warning');
    assert.ok(result.uniqueRatio >= 0.85);
  });

  it('flags unique-id header columns', () => {
    const result = analyzeProjectIdentitySelection({
      headers: ['Record ID'],
      dataRows: Array.from({ length: 5 }, (_, i) => [`id-${i}`]),
      composition: { columnIndexes: [0], separator: ' ' },
    });
    assert.equal(result.kind, 'looks_like_unique_id');
  });

  it('flags ZIP-like columns', () => {
    const result = analyzeProjectIdentitySelection({
      headers: ['Zip Code'],
      dataRows: [
        ['37211'],
        ['37212'],
        ['37203'],
        ['37027'],
        ['37129'],
      ],
      composition: { columnIndexes: [0], separator: ' ' },
      groupCount: 5,
    });
    assert.equal(result.kind, 'looks_like_zip');
  });

  it('flags email-like columns', () => {
    const result = analyzeProjectIdentitySelection({
      headers: ['Email'],
      dataRows: [
        ['a@example.com'],
        ['b@example.com'],
        ['c@example.com'],
        ['d@example.com'],
        ['e@example.com'],
      ],
      composition: { columnIndexes: [0], separator: ' ' },
    });
    assert.equal(result.kind, 'looks_like_email');
  });

  it('flags first-name columns with many unique values', () => {
    const result = analyzeProjectIdentitySelection({
      headers: ['First Name'],
      dataRows: [
        ['Sarah'],
        ['John'],
        ['Amy'],
        ['Mike'],
        ['Lisa'],
        ['Tom'],
        ['Jen'],
        ['Chris'],
        ['Pat'],
        ['Alex'],
      ],
      composition: { columnIndexes: [0], separator: ' ' },
    });
    assert.equal(result.kind, 'looks_like_first_name');
  });

  it('accepts a repeating project-name column without warning', () => {
    const result = analyzeProjectIdentitySelection({
      headers: ['Project Name', 'First Name'],
      dataRows: [
        ['Oak Ridge', 'Sarah'],
        ['Oak Ridge', 'John'],
        ['Maple Grove', 'Amy'],
        ['Maple Grove', 'Mike'],
        ['Sunset Villas', 'Lisa'],
        ['Sunset Villas', 'Tom'],
        ['Oak Ridge', 'Jen'],
        ['Maple Grove', 'Chris'],
      ],
      composition: { columnIndexes: [0], separator: ' ' },
      groupCount: 3,
    });
    assert.equal(result.kind, 'none');
    assert.equal(result.severity, 'none');
    assert.equal(result.groupCount, 3);
  });

  it('uses composed multi-column values when analyzing cardinality', () => {
    const result = analyzeProjectIdentitySelection({
      headers: ['City', 'Property Name'],
      dataRows: [
        ['Nashville', 'Oak Ridge'],
        ['Nashville', 'Oak Ridge'],
        ['Seattle', 'Maple Grove'],
        ['Seattle', 'Maple Grove'],
      ],
      composition: { columnIndexes: [0, 1], separator: ' - ' },
      groupCount: 2,
    });
    assert.equal(result.kind, 'none');
    assert.equal(result.groupCount, 2);
  });
});
