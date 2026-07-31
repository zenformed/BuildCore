import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createInitialInterviewState } from '@/presentation/features/crmImport/interview/interviewState';
import { resolveInterviewImportSource } from '@/presentation/features/crmImport/interview/resolveInterviewImportSource';
import { buildImportDuplicateRowSummary } from '@/presentation/features/crmImport/interview/importDuplicateProbe';

describe('resolveInterviewImportSource', () => {
  it('returns composed First+Last contact and subproject values for duplicate review', async () => {
    const interview = {
      ...createInitialInterviewState({
        launchMode: 'into_existing_parent' as const,
        fixedParentProjectId: 'p1',
      }),
      subprojectComposition: { columnIndexes: [0, 1] as const, separator: ' ' as const },
      contactComposition: { columnIndexes: [0, 1] as const, separator: ' ' as const },
      remainingFields: [],
    };

    const source = await resolveInterviewImportSource({
      interview,
      headers: ['First Name', 'Last Name', 'Phone'],
      rows: [{ sourceRowIndex: 1, cells: { 0: 'Emma', 1: 'Stone', 2: '2065551212' } }],
      sheetName: 'Sheet1',
      headerRowIndex: 0,
      sheetMatrix: [
        ['First Name', 'Last Name', 'Phone'],
        ['Emma', 'Stone', '2065551212'],
      ],
      headerRowGroups: [],
      parsedFile: null,
      parseFailedMessage: 'parse failed',
    });

    assert.equal(source.rows[0]?.cells[0], 'Emma Stone');

    const summary = buildImportDuplicateRowSummary(source.rows[0]!, source.mappings);
    assert.equal(summary.contactName, 'Emma Stone');
    assert.equal(summary.name, 'Emma Stone');
  });
});
