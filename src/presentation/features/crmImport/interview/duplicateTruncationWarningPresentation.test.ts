import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildDuplicateTruncationWarningModel } from './duplicateTruncationWarningPresentation';
import type { DuplicateTruncationWarningCopy } from './duplicateTruncationWarningPresentation';

const copy: DuplicateTruncationWarningCopy = {
  existingRecordsPartial: (searched, matching) =>
    `BuildCore checked ${searched} of ${matching} existing records that shared matching customer information. Some possible duplicates may not be shown.`,
  identityValuesPartial: (searched, total) =>
    `BuildCore checked ${searched} of ${total} unique matching values from this import. Some possible duplicates may not be shown.`,
  multipleLimitsSummary: 'Duplicate checking reached multiple search limits.',
  viewDetails: 'View details.',
  detailIdentityValues: (searched, total) => `Identity values checked: ${searched} of ${total}`,
  detailExistingRecords: (searched, matching) =>
    `Existing records checked: ${searched} of ${matching}`,
  detailCandidates: (returned, total) => `Candidates returned: ${returned} of ${total}`,
  detailGroups: (returned, total) => `Duplicate groups returned: ${returned} of ${total}`,
  chunkFailed:
    'Duplicate checking stopped early after a search step failed. Some possible duplicates may not be shown.',
  candidatesCapped: (returned, total) =>
    `BuildCore returned the top ${returned} of ${total} candidate matches per row. Some lower-ranked matches may not be shown.`,
  groupsCapped: (returned, total) =>
    `BuildCore returned ${returned} of ${total} duplicate groups. Some groups may not be shown.`,
  genericPartial:
    'Duplicate checking was incomplete. Some possible matches may not be shown.',
};

describe('buildDuplicateTruncationWarningModel', () => {
  it('returns null when not truncated', () => {
    assert.equal(
      buildDuplicateTruncationWarningModel(
        {
          truncated: false,
          returnedCandidateCount: 0,
          searchedExistingRecordCount: 5,
          matchingExistingRecordCount: 5,
        },
        copy
      ),
      null
    );
  });

  it('shows exact existing-record coverage counts', () => {
    const model = buildDuplicateTruncationWarningModel(
      {
        truncated: true,
        reasons: ['max_existing_records_per_query'],
        searchedExistingRecordCount: 200,
        matchingExistingRecordCount: 850,
        returnedCandidateCount: 0,
      },
      copy
    );
    assert.ok(model);
    assert.equal(
      model.summary,
      'BuildCore checked 200 of 850 existing records that shared matching customer information. Some possible duplicates may not be shown.'
    );
    assert.equal(model.details, null);
  });

  it('shows exact identity-value coverage counts', () => {
    const model = buildDuplicateTruncationWarningModel(
      {
        truncated: true,
        reasons: ['max_unique_identity_values'],
        searchedIdentityValueCount: 1000,
        uniqueIdentityValueCount: 2400,
        returnedCandidateCount: 3,
      },
      copy
    );
    assert.ok(model);
    assert.equal(
      model.summary,
      'BuildCore checked 1000 of 2400 unique matching values from this import. Some possible duplicates may not be shown.'
    );
  });

  it('uses multi-limit summary with coverage details', () => {
    const model = buildDuplicateTruncationWarningModel(
      {
        truncated: true,
        reasons: ['max_unique_identity_values', 'max_groups'],
        searchedIdentityValueCount: 1000,
        uniqueIdentityValueCount: 1500,
        searchedExistingRecordCount: 100,
        matchingExistingRecordCount: 100,
        returnedCandidateCount: 20,
        totalCandidateCount: 20,
        returnedGroupCount: 50,
        totalGroupCount: 80,
      },
      copy
    );
    assert.ok(model);
    assert.equal(model.summary, 'Duplicate checking reached multiple search limits.');
    assert.equal(model.hasMultipleReasons, true);
    assert.deepEqual(model.details, [
      'Identity values checked: 1000 of 1500',
      'Existing records checked: 100 of 100',
      'Candidates returned: 20 of 20',
      'Duplicate groups returned: 50 of 80',
    ]);
  });
});
