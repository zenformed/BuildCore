import type { CrmDataSource } from '@/infrastructure/config/crmDataSource';
import { isDemoRuntimeClient } from '@/infrastructure/runtime/buildCoreRuntime';

/**
 * CRM persistence source for the active runtime.
 * DEMO always uses in-memory mock repositories with local demo persistence.
 */
export function resolveCrmDataSourceForRuntime(): CrmDataSource {
  if (isDemoRuntimeClient()) {
    return 'mock';
  }
  const value = process.env.NEXT_PUBLIC_CRM_DATA_SOURCE;
  if (value === 'api') return 'api';
  return 'mock';
}
