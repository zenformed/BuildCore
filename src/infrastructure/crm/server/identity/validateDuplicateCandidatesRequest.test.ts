import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { CRM_DUPLICATE_DETECTION_LIMITS } from '@/domain/crm/identity/duplicateCandidateTypes';
import {
  parseDuplicateCandidatesBatchRequest,
  parseDuplicateCandidatesRequest,
} from './validateDuplicateCandidatesRequest';
import { CrmDuplicateDetectionValidationError } from './crmDuplicateCandidateService';

describe('validateDuplicateCandidatesRequest', () => {
  it('parses a valid single probe request', () => {
    const parsed = parseDuplicateCandidatesRequest({
      contactName: 'Brenda Smith',
      emails: ['brenda@example.com'],
      phones: ['6155551111'],
      excludeRecordId: 'rec-1',
      maxCandidates: 5,
      minConfidence: 'medium',
    });
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    assert.equal(parsed.options.probe.contactName, 'Brenda Smith');
    assert.equal(parsed.options.excludeRecordId, 'rec-1');
    assert.equal(parsed.options.maxCandidates, 5);
    assert.equal(parsed.options.minConfidence, 'medium');
  });

  it('rejects invalid single payloads', () => {
    assert.equal(parseDuplicateCandidatesRequest(null).ok, false);
    assert.equal(parseDuplicateCandidatesRequest({ emails: 'x' }).ok, false);
    assert.equal(parseDuplicateCandidatesRequest({ minConfidence: 'extreme' }).ok, false);
  });

  it('parses a valid batch request', () => {
    const parsed = parseDuplicateCandidatesBatchRequest({
      items: [
        { incomingId: 'r1', emails: ['a@b.com'] },
        { incomingId: 'r2', phones: ['6155551111'] },
      ],
      includeIncomingMatches: true,
    });
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    assert.equal(parsed.options.items.length, 2);
  });

  it('rejects batch without items or missing incomingId', () => {
    assert.equal(parseDuplicateCandidatesBatchRequest({}).ok, false);
    assert.equal(
      parseDuplicateCandidatesBatchRequest({ items: [{ emails: ['a@b.com'] }] }).ok,
      false
    );
  });

  it('parses includeArchived for single and batch requests', () => {
    const single = parseDuplicateCandidatesRequest({
      emails: ['a@b.com'],
      includeArchived: true,
    });
    assert.equal(single.ok, true);
    if (single.ok) assert.equal(single.options.includeArchived, true);

    const batch = parseDuplicateCandidatesBatchRequest({
      items: [{ incomingId: 'r1', emails: ['a@b.com'] }],
      includeArchived: false,
    });
    assert.equal(batch.ok, true);
    if (batch.ok) assert.equal(batch.options.includeArchived, false);

    assert.equal(
      parseDuplicateCandidatesRequest({ emails: ['a@b.com'], includeArchived: 'yes' }).ok,
      false
    );
  });
});

describe('CrmDuplicateDetectionValidationError', () => {
  it('carries structured code for oversized batches', () => {
    const err = new CrmDuplicateDetectionValidationError(
      'batch_too_large',
      'too big',
      { maxBatchRows: CRM_DUPLICATE_DETECTION_LIMITS.maxBatchRows, received: 999 }
    );
    assert.equal(err.code, 'batch_too_large');
    assert.equal(err.details?.received, 999);
  });
});
