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
