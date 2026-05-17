export type CrmDataSource = 'mock' | 'api';

/**
 * CRM persistence source for repository factory.
 * `api` uses BuildCore BFF routes (`/api/crm/*`); `mock` is the default.
 */
export function getCrmDataSource(): CrmDataSource {
  const value = process.env.NEXT_PUBLIC_CRM_DATA_SOURCE;
  if (value === 'api') return 'api';
  return 'mock';
}
