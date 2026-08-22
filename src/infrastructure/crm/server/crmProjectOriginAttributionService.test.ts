import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  CrmProjectOriginAttributionError,
  resolveCrmProjectOriginatorForCreate,
} from './crmProjectOriginAttributionService';

function memberClient(role: string | null, activeUserIds: readonly string[]): SupabaseClient {
  return {
    from: () => {
      let table = '';
      const query = {
        select: () => query,
        eq: (column: string, value: string) => {
          if (column === 'user_id') {
            table = value;
          }
          return query;
        },
        maybeSingle: async () => {
          if (role != null && activeUserIds.length === 0) {
            return { data: { role }, error: null };
          }
          return {
            data: activeUserIds.includes(table) ? { user_id: table } : null,
            error: null,
          };
        },
      };
      return query;
    },
  } as unknown as SupabaseClient;
}

describe('resolveCrmProjectOriginatorForCreate', () => {
  it('defaults a normal create to the authenticated actor', async () => {
    const result = await resolveCrmProjectOriginatorForCreate(
      memberClient('coordinator', []),
      memberClient(null, ['actor']),
      'org',
      'actor',
      null
    );
    assert.equal(result, 'actor');
  });

  it('rejects non-admin on-behalf-of origin attribution', async () => {
    await assert.rejects(
      resolveCrmProjectOriginatorForCreate(
        memberClient('coordinator', []),
        memberClient(null, ['rep']),
        'org',
        'actor',
        'rep'
      ),
      CrmProjectOriginAttributionError
    );
  });

  it('allows an admin to choose only an active same-org member', async () => {
    const result = await resolveCrmProjectOriginatorForCreate(
      memberClient('admin', []),
      memberClient(null, ['rep']),
      'org',
      'actor',
      'rep'
    );
    assert.equal(result, 'rep');
  });
});
