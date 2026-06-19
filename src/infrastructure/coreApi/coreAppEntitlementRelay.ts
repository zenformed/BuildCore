/**
 * Relay app entitlements from ZenformedCore (canonical access source).
 */

import {
  inactiveAppEntitlementSnapshot,
  parseSaaSEntitlementSnapshotJson,
  type SaaSEntitlementSnapshot,
} from '@zenformed/core';
import { getAppEntitlement } from '@/infrastructure/coreApi/client';
import type { CoreApiResult } from '@/infrastructure/coreApi/types';

export type CoreAppEntitlementRelayResult =
  | { ok: true; snapshot: SaaSEntitlementSnapshot }
  | { ok: false; kind: 'unauthenticated' | 'not_found' | 'unreachable' | 'unconfigured' };

export function mapCoreEntitlementEnvelopeToSnapshot(
  appSlug: string,
  entitlement: unknown
): SaaSEntitlementSnapshot {
  const normalizedSlug = appSlug.trim().toLowerCase();
  const parsed = parseSaaSEntitlementSnapshotJson(entitlement, normalizedSlug);
  if (parsed != null) {
    return parsed;
  }
  return inactiveAppEntitlementSnapshot(normalizedSlug);
}

export async function fetchCoreAppEntitlementSnapshot(
  appSlug: string,
  accessToken: string
): Promise<CoreAppEntitlementRelayResult> {
  const normalizedSlug = appSlug.trim().toLowerCase();
  const result = await getAppEntitlement(normalizedSlug, accessToken, {
    authorityMode: 'platform',
  });

  if (!result.ok) {
    if (result.error.kind === 'http_error') {
      const status = result.error.status;
      if (status === 401 || status === 403) {
        return { ok: false, kind: 'unauthenticated' };
      }
      if (status === 404) {
        return { ok: false, kind: 'not_found' };
      }
    }
    return { ok: false, kind: 'unreachable' };
  }

  const snapshot = result.data.entitlement;
  return {
    ok: true,
    snapshot:
      snapshot.appSlug.trim() !== ''
        ? snapshot
        : mapCoreEntitlementEnvelopeToSnapshot(result.data.appSlug, snapshot),
  };
}
