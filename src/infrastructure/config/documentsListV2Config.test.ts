import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  isDocumentsListV2ClientFlagEnabled,
  isDocumentsListV2EnabledForOrganization,
  isDocumentsListV2GloballyEnabled,
} from './documentsListV2Config';

const ORG_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const ORG_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

describe('documentsListV2Config', () => {
  it('defaults off', () => {
    const env = {};
    assert.equal(isDocumentsListV2GloballyEnabled(env), false);
    assert.equal(isDocumentsListV2EnabledForOrganization(ORG_A, env), false);
    assert.equal(isDocumentsListV2ClientFlagEnabled(env), false);
  });

  it('global flag enables all orgs', () => {
    const env = { BUILDCORE_DOCUMENTS_LIST_V2: 'true' };
    assert.equal(isDocumentsListV2EnabledForOrganization(ORG_A, env), true);
    assert.equal(isDocumentsListV2EnabledForOrganization(ORG_B, env), true);
  });

  it('allowlist enables only listed orgs when global off', () => {
    const env = {
      BUILDCORE_DOCUMENTS_LIST_V2_ORG_ALLOWLIST: `${ORG_A},${ORG_B.toUpperCase()}`,
    };
    assert.equal(isDocumentsListV2EnabledForOrganization(ORG_A, env), true);
    assert.equal(isDocumentsListV2EnabledForOrganization(ORG_B, env), true);
    assert.equal(
      isDocumentsListV2EnabledForOrganization('cccccccc-cccc-4ccc-8ccc-cccccccccccc', env),
      false
    );
  });

  it('client flag is independent of server', () => {
    assert.equal(
      isDocumentsListV2ClientFlagEnabled({ NEXT_PUBLIC_BUILDCORE_DOCUMENTS_LIST_V2: 'true' }),
      true
    );
    assert.equal(
      isDocumentsListV2ClientFlagEnabled({
        NEXT_PUBLIC_BUILDCORE_DOCUMENTS_LIST_V2: 'false',
        BUILDCORE_DOCUMENTS_LIST_V2: 'true',
      }),
      false
    );
  });
});
