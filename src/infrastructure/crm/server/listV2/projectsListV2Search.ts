/**
 * Server-side search prep for Projects list v2.
 * Uses normalized identity forms; never logs raw search.
 */

import { normalizeIdentityEmail, normalizeIdentityPhone } from '@/domain/crm/identity';

export type CrmProjectsListV2SearchParams = {
  /** Lowercased prefix for identity / name / company left-anchored match; null when inactive. */
  readonly searchPrefix: string | null;
  /** Exact normalized email when search looks like an email; else null. */
  readonly searchEmail: string | null;
  /** Exact normalized US phone digits when search is a complete phone; else null. */
  readonly searchPhone: string | null;
};

/** Build RPC search binds from an already-normalized request search (or null). */
export function buildCrmProjectsListV2SearchParams(
  normalizedSearch: string | null
): CrmProjectsListV2SearchParams {
  if (normalizedSearch == null) {
    return { searchPrefix: null, searchEmail: null, searchPhone: null };
  }

  const searchEmail = normalizeIdentityEmail(normalizedSearch);
  const searchPhone = normalizeIdentityPhone(normalizedSearch);

  return {
    searchPrefix: normalizedSearch,
    searchEmail,
    searchPhone,
  };
}
