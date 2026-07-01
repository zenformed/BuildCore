import type { CrmProjectPreview } from '@/domain/crm/projectPreview';
import { getCrmDataSource } from '@/infrastructure/config/crmDataSource';
import { crmApiGetJson } from '@/infrastructure/crm/api/crmApiClient';
import { getEffectiveMockProjectDetailBySlug } from '@/infrastructure/crm/mock/mockCrmMutationStore';
import { getMockProjectCustomFieldsForProject } from '@/infrastructure/crm/mock/mockProjectCustomFieldsStore';

export async function fetchCrmProjectPreview(slug: string): Promise<CrmProjectPreview | null> {
  const trimmed = slug.trim();
  if (!trimmed) return null;

  if (getCrmDataSource() !== 'api') {
    const detail = getEffectiveMockProjectDetailBySlug(trimmed);
    if (detail == null) return null;
    return {
      summary: {
        ...detail.summary,
        customFields: getMockProjectCustomFieldsForProject(
          detail.summary.id,
          detail.summary.parentProjectId
        ),
      },
      notes: detail.notes,
    };
  }

  return crmApiGetJson<CrmProjectPreview>(
    `/api/crm/projects/${encodeURIComponent(trimmed)}/preview`
  );
}
