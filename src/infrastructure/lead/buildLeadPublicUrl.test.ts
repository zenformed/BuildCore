import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildLeadPublicPath,
  buildLeadPublicUrl,
} from '@/infrastructure/lead/buildLeadPublicUrl';
import { generateCrmProjectLeadToken } from '@/infrastructure/lead/generateLeadToken';

describe('generateCrmProjectLeadToken', () => {
  it('returns a UUID-shaped token', () => {
    const token = generateCrmProjectLeadToken();
    assert.match(token, /^[0-9a-f-]{36}$/i);
  });
});

describe('buildLeadPublicPath', () => {
  it('builds a lead path from token', () => {
    assert.equal(buildLeadPublicPath('abc-123'), '/lead/abc-123');
  });
});

describe('buildLeadPublicUrl', () => {
  it('uses configured public app URL on the server', () => {
    const previous = process.env.BUILDCORE_PUBLIC_APP_URL;
    process.env.BUILDCORE_PUBLIC_APP_URL = 'https://buildcore.zenformed.com';
    try {
      assert.equal(
        buildLeadPublicUrl('token-123'),
        'https://buildcore.zenformed.com/lead/token-123'
      );
    } finally {
      if (previous == null) {
        delete process.env.BUILDCORE_PUBLIC_APP_URL;
      } else {
        process.env.BUILDCORE_PUBLIC_APP_URL = previous;
      }
    }
  });
});
