import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  isPhotosListV2ClientFlagEnabled,
  isPhotosListV2EnabledForOrganization,
  isPhotosListV2GloballyEnabled,
} from './photosListV2Config';

const ORG_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const ORG_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

describe('photosListV2Config', () => {
  it('defaults off', () => {
    const env = {};
    assert.equal(isPhotosListV2GloballyEnabled(env), false);
    assert.equal(isPhotosListV2EnabledForOrganization(ORG_A, env), false);
    assert.equal(isPhotosListV2ClientFlagEnabled(env), false);
  });

  it('global flag enables all orgs', () => {
    const env = { BUILDCORE_PHOTOS_LIST_V2: 'true' };
    assert.equal(isPhotosListV2EnabledForOrganization(ORG_A, env), true);
    assert.equal(isPhotosListV2EnabledForOrganization(ORG_B, env), true);
  });

  it('allowlist enables only listed orgs when global off', () => {
    const env = {
      BUILDCORE_PHOTOS_LIST_V2_ORG_ALLOWLIST: `${ORG_A},${ORG_B.toUpperCase()}`,
    };
    assert.equal(isPhotosListV2EnabledForOrganization(ORG_A, env), true);
    assert.equal(isPhotosListV2EnabledForOrganization(ORG_B, env), true);
    assert.equal(
      isPhotosListV2EnabledForOrganization('cccccccc-cccc-4ccc-8ccc-cccccccccccc', env),
      false
    );
  });

  it('client flag is independent of server', () => {
    assert.equal(
      isPhotosListV2ClientFlagEnabled({ NEXT_PUBLIC_BUILDCORE_PHOTOS_LIST_V2: 'true' }),
      true
    );
    assert.equal(
      isPhotosListV2ClientFlagEnabled({
        NEXT_PUBLIC_BUILDCORE_PHOTOS_LIST_V2: 'false',
        BUILDCORE_PHOTOS_LIST_V2: 'true',
      }),
      false
    );
  });
});
