import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { CRM_DUPLICATE_DETECTION_LIMITS } from '@/domain/crm/identity';
import { CrmDuplicateDetectionValidationError } from './crmDuplicateCandidateService';
import {
  parseDuplicateCandidatesBatchRequest,
  parseDuplicateCandidatesRequest,
} from './validateDuplicateCandidatesRequest';

describe('validateDuplicateCandidatesRequest', () => {
  it('parses a valid single probe request', () => {
    const parsed = parseDuplicateCandidatesRequest({
      emails: ['Ada@Example.com'],
      phones: ['(615) 555-1111'],
      maxCandidates: 5,
    });
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    assert.deepEqual(parsed.options.probe.emails, ['Ada@Example.com']);
    assert.equal(parsed.options.maxCandidates, 5);
  });

  it('rejects invalid single payloads', () => {
    assert.equal(parseDuplicateCandidatesRequest(null).ok, false);
    assert.equal(parseDuplicateCandidatesRequest({ emails: 'x' }).ok, false);
    assert.equal(parseDuplicateCandidatesRequest({ recordType: 'widget' }).ok, false);
  });

  it('parses a valid batch request', () => {
    const parsed = parseDuplicateCandidatesBatchRequest({
      items: [{ incomingId: 'row:1', emails: ['a@b.com'] }],
    });
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    assert.equal(parsed.options.items.length, 1);
    assert.equal(parsed.options.items[0]?.incomingId, 'row:1');
  });

  it('rejects batch without items or missing incomingId', () => {
    assert.equal(parseDuplicateCandidatesBatchRequest({}).ok, false);
    assert.equal(
      parseDuplicateCandidatesBatchRequest({ items: [{ emails: ['a@b.com'] }] }).ok,
      false
    );
  });

  it('parses includeArchived and includeInactive for single and batch requests', () => {
    const single = parseDuplicateCandidatesRequest({
      emails: ['a@b.com'],
      includeArchived: true,
      includeInactive: true,
    });
    assert.equal(single.ok, true);
    if (single.ok) {
      assert.equal(single.options.includeArchived, true);
      assert.equal(single.options.includeInactive, true);
    }

    const batch = parseDuplicateCandidatesBatchRequest({
      items: [{ incomingId: 'r1', emails: ['a@b.com'] }],
      includeArchived: false,
      includeInactive: false,
    });
    assert.equal(batch.ok, true);
    if (batch.ok) {
      assert.equal(batch.options.includeArchived, false);
      assert.equal(batch.options.includeInactive, false);
    }

    assert.equal(
      parseDuplicateCandidatesRequest({ emails: ['a@b.com'], includeArchived: 'yes' }).ok,
      false
    );
    assert.equal(
      parseDuplicateCandidatesRequest({ emails: ['a@b.com'], includeInactive: 'yes' }).ok,
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
