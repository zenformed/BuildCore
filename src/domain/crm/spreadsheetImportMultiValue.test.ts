import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  collectMappedStandardCellValues,
  duplicateOrOverLimitMappingMessage,
  expandDelimitedContactValues,
  maxStandardFieldMappings,
} from '@/domain/crm/spreadsheetImportMultiValue';

describe('spreadsheetImportMultiValue', () => {
  it('caps phones and emails at 4 mappings', () => {
    assert.equal(maxStandardFieldMappings('phones'), 4);
    assert.equal(maxStandardFieldMappings('emails'), 4);
    assert.equal(maxStandardFieldMappings('city'), 1);
  });

  it('collects and expands values from every mapped phone column', () => {
    const mappings = [
      {
        sourceIndex: 0,
        originalHeader: 'Cell',
        ownership: 'subproject' as const,
        destination: {
          kind: 'standard_field' as const,
          entity: 'subproject' as const,
          key: 'phones',
        },
      },
      {
        sourceIndex: 1,
        originalHeader: 'Home',
        ownership: 'subproject' as const,
        destination: {
          kind: 'standard_field' as const,
          entity: 'subproject' as const,
          key: 'phones',
        },
      },
    ];
    const cells = collectMappedStandardCellValues(
      { sourceRowIndex: 1, cells: { 0: '7135550100', 1: '5125550199; 2105550111' } },
      mappings,
      'phones'
    );
    assert.deepEqual(cells, ['7135550100', '5125550199; 2105550111']);
    assert.deepEqual(expandDelimitedContactValues(cells), [
      '7135550100',
      '5125550199',
      '2105550111',
    ]);
  });

  it('uses distinct messages for single vs multi over-limit', () => {
    assert.equal(duplicateOrOverLimitMappingMessage('city', 1), 'Duplicate mapping for city.');
    assert.equal(
      duplicateOrOverLimitMappingMessage('phones', 4),
      'Too many columns mapped to phones (maximum 4).'
    );
  });
});
