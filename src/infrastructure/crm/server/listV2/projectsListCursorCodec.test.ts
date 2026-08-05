import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { normalizeCrmProjectsListV2Request } from '@/domain/crm/projectsListV2';
import {
  CrmProjectsListV2InvalidCursorError,
  decodeCrmProjectsListV2Cursor,
  encodeCrmProjectsListV2Cursor,
} from './projectsListCursorCodec';

const SECRET = 'test-cursor-secret-value-32chars!!';
const ORG = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const OTHER_ORG = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const PARENT = '11111111-1111-4111-8111-111111111111';
const ROW_ID = '99999999-9999-4999-8999-999999999999';

function envWithSecret(extra: Record<string, string> = {}): Record<string, string | undefined> {
  return { BUILDCORE_LIST_CURSOR_SECRET: SECRET, ...extra };
}

async function rootsRequest() {
  const normalized = normalizeCrmProjectsListV2Request({ view: 'roots', limit: 50 });
  assert.equal(normalized.ok, true);
  if (!normalized.ok) throw new Error('normalize failed');
  return normalized.request;
}

describe('projectsListCursorCodec', () => {
  it('round-trips a valid cursor', async () => {
    const request = await rootsRequest();
    const token = await encodeCrmProjectsListV2Cursor({
      organizationId: ORG,
      request,
      direction: 'forward',
      values: [1, '2024-06-01T12:00:00.000Z', ROW_ID],
      id: ROW_ID,
      env: envWithSecret(),
      nowMs: 1_700_000_000_000,
    });
    const decoded = await decodeCrmProjectsListV2Cursor({
      cursor: token,
      organizationId: ORG,
      request,
      env: envWithSecret(),
      nowMs: 1_700_000_000_000,
    });
    assert.equal(decoded.id, ROW_ID);
    assert.equal(decoded.view, 'roots');
    assert.equal(decoded.fingerprint, request.fingerprint);
    assert.deepEqual(decoded.values, [1, '2024-06-01T12:00:00.000Z', ROW_ID]);
  });

  it('rejects tampered payload / wrong signature', async () => {
    const request = await rootsRequest();
    const token = await encodeCrmProjectsListV2Cursor({
      organizationId: ORG,
      request,
      direction: 'forward',
      values: [0, null, ROW_ID],
      id: ROW_ID,
      env: envWithSecret(),
    });
    const tampered = `${token.slice(0, -4)}aaaa`;
    await assert.rejects(
      () =>
        decodeCrmProjectsListV2Cursor({
          cursor: tampered,
          organizationId: ORG,
          request,
          env: envWithSecret(),
        }),
      CrmProjectsListV2InvalidCursorError
    );
    await assert.rejects(
      () =>
        decodeCrmProjectsListV2Cursor({
          cursor: token,
          organizationId: ORG,
          request,
          env: envWithSecret({ BUILDCORE_LIST_CURSOR_SECRET: 'different-secret-value-32chars!!!!' }),
        }),
      CrmProjectsListV2InvalidCursorError
    );
  });

  it('rejects wrong organization, view, parent, fingerprint, and sort', async () => {
    const roots = await rootsRequest();
    const childrenNorm = normalizeCrmProjectsListV2Request({
      view: 'children_of_parent',
      parentProjectId: PARENT,
      limit: 50,
    });
    assert.equal(childrenNorm.ok, true);
    if (!childrenNorm.ok) return;
    const children = childrenNorm.request;

    const token = await encodeCrmProjectsListV2Cursor({
      organizationId: ORG,
      request: roots,
      direction: 'forward',
      values: [1, null, ROW_ID],
      id: ROW_ID,
      env: envWithSecret(),
    });

    await assert.rejects(
      () =>
        decodeCrmProjectsListV2Cursor({
          cursor: token,
          organizationId: OTHER_ORG,
          request: roots,
          env: envWithSecret(),
        }),
      CrmProjectsListV2InvalidCursorError
    );

    await assert.rejects(
      () =>
        decodeCrmProjectsListV2Cursor({
          cursor: token,
          organizationId: ORG,
          request: children,
          env: envWithSecret(),
        }),
      CrmProjectsListV2InvalidCursorError
    );

    const limit25 = normalizeCrmProjectsListV2Request({ view: 'roots', limit: 25 });
    assert.equal(limit25.ok, true);
    if (!limit25.ok) return;
    await assert.rejects(
      () =>
        decodeCrmProjectsListV2Cursor({
          cursor: token,
          organizationId: ORG,
          request: limit25.request,
          env: envWithSecret(),
        }),
      CrmProjectsListV2InvalidCursorError
    );
  });

  it('rejects malformed and expired cursors', async () => {
    const request = await rootsRequest();
    await assert.rejects(
      () =>
        decodeCrmProjectsListV2Cursor({
          cursor: 'not-a-jwt',
          organizationId: ORG,
          request,
          env: envWithSecret(),
        }),
      CrmProjectsListV2InvalidCursorError
    );

    const issued = 1_700_000_000_000;
    const token = await encodeCrmProjectsListV2Cursor({
      organizationId: ORG,
      request,
      direction: 'forward',
      values: [1, null, ROW_ID],
      id: ROW_ID,
      env: envWithSecret(),
      nowMs: issued,
    });
    await assert.rejects(
      () =>
        decodeCrmProjectsListV2Cursor({
          cursor: token,
          organizationId: ORG,
          request,
          env: envWithSecret(),
          nowMs: issued + 8 * 24 * 60 * 60 * 1000,
          maxAgeMs: 7 * 24 * 60 * 60 * 1000,
        }),
      CrmProjectsListV2InvalidCursorError
    );
  });

  it('rejects parent mismatch for children cursors', async () => {
    const childrenA = normalizeCrmProjectsListV2Request({
      view: 'children_of_parent',
      parentProjectId: PARENT,
    });
    const otherParent = '22222222-2222-4222-8222-222222222222';
    const childrenB = normalizeCrmProjectsListV2Request({
      view: 'children_of_parent',
      parentProjectId: otherParent,
    });
    assert.equal(childrenA.ok && childrenB.ok, true);
    if (!childrenA.ok || !childrenB.ok) return;

    const token = await encodeCrmProjectsListV2Cursor({
      organizationId: ORG,
      request: childrenA.request,
      direction: 'backward',
      values: [0, '2024-01-01T00:00:00.000Z', ROW_ID],
      id: ROW_ID,
      env: envWithSecret(),
    });

    await assert.rejects(
      () =>
        decodeCrmProjectsListV2Cursor({
          cursor: token,
          organizationId: ORG,
          request: childrenB.request,
          env: envWithSecret(),
        }),
      CrmProjectsListV2InvalidCursorError
    );
  });
});
