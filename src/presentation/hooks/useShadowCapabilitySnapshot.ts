'use client';

import type { Session } from '@supabase/supabase-js';
import type { SaaSEntitlementSnapshot } from '@/application/ports';
import { env } from '@/infrastructure/config/env';

export type ShadowCapabilitySnapshotResult = Record<string, unknown>;

export type UseShadowCapabilitySnapshotState = {
  enabled: boolean;
  loading: boolean;
  snapshot: ShadowCapabilitySnapshotResult | null;
  error: string | null;
};

/**
 * Passive capability cache diagnostics — disabled in Zenformed Test App (no `/api/internal/shadow-capability-snapshot`).
 * ForgeCore enables this when `NEXT_PUBLIC_ENABLE_SHADOW_CAPABILITY_READS=true`.
 */
export function useShadowCapabilitySnapshot(_input: {
  session: Session | null;
  userId: string | null;
  entitlementSnapshot: SaaSEntitlementSnapshot | null;
  profileReady: boolean;
}): UseShadowCapabilitySnapshotState {
  const enabled = env.enableShadowCapabilityReads && env.isSaasMode && !env.useMockAuth;
  return { enabled, loading: false, snapshot: null, error: null };
}
