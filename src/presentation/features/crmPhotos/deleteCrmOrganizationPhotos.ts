import { crmApiDeleteJson } from '@/infrastructure/crm/api/crmApiClient';

export async function deleteCrmOrganizationPhotos(
  documentIds: readonly string[]
): Promise<{ readonly deletedCount: number; readonly failedCount: number }> {
  const body = await crmApiDeleteJson<{
    deletedCount?: number;
    failedCount?: number;
  }>('/api/crm/photos', { documentIds: [...documentIds] });
  return {
    deletedCount: body.deletedCount ?? 0,
    failedCount: body.failedCount ?? 0,
  };
}
