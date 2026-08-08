import { resolveCrmDataSourceForRuntime } from '@/infrastructure/runtime/resolveCrmDataSourceForRuntime';

export type CrmDataSource = 'mock' | 'api';

/**
 * CRM persistence source for repository factory.
 * `api` uses BuildCore BFF routes (`/api/crm/*`); `mock` is the default.
 * DEMO runtime always resolves to `mock`.
 */
export function getCrmDataSource(): CrmDataSource {
  return resolveCrmDataSourceForRuntime();
}

/**
 * V2 list UIs are production API adapters, not alternate mock repositories.
 * Keep runtime selection at this boundary so DEMO always stays on the shared
 * repository-backed UI even when production V2 feature flags are enabled.
 */
export function shouldUseProductionCrmListV2(
  clientFlagEnabled: boolean,
  source: CrmDataSource = getCrmDataSource()
): boolean {
  return clientFlagEnabled && source === 'api';
}
