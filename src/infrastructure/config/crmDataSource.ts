export type CrmDataSource = 'mock' | 'api';

/**
 * CRM persistence source for repository factory.
 * `api` is reserved for future BFF/Supabase — not implemented in Phase 6.
 */
export function getCrmDataSource(): CrmDataSource {
  const value = process.env.NEXT_PUBLIC_CRM_DATA_SOURCE;
  if (value === 'api') return 'api';
  return 'mock';
}
