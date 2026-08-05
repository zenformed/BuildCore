import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  isProjectsListV2ClientFlagEnabled,
  isProjectsListV2EnabledForOrganization,
  isProjectsListV2GloballyEnabled,
} from './projectsListV2Config';

const ORG_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const ORG_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

describe('projectsListV2 feature flag', () => {
  it('is off by default', () => {
    const env = {};
    assert.equal(isProjectsListV2GloballyEnabled(env), false);
    assert.equal(isProjectsListV2EnabledForOrganization(ORG_A, env), false);
    assert.equal(isProjectsListV2ClientFlagEnabled(env), false);
  });

  it('enables all orgs when master flag is true', () => {
    const env = { BUILDCORE_PROJECTS_LIST_V2: 'true' };
    assert.equal(isProjectsListV2EnabledForOrganization(ORG_A, env), true);
    assert.equal(isProjectsListV2EnabledForOrganization(ORG_B, env), true);
  });

  it('supports organization allowlist when master flag is off', () => {
    const env = {
      BUILDCORE_PROJECTS_LIST_V2: 'false',
      BUILDCORE_PROJECTS_LIST_V2_ORG_ALLOWLIST: `${ORG_A}, ${ORG_B.toUpperCase()}`,
    };
    assert.equal(isProjectsListV2EnabledForOrganization(ORG_A, env), true);
    assert.equal(isProjectsListV2EnabledForOrganization(ORG_B, env), true);
    assert.equal(
      isProjectsListV2EnabledForOrganization('cccccccc-cccc-4ccc-8ccc-cccccccccccc', env),
      false
    );
  });
});
