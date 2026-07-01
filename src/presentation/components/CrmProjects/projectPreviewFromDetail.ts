import type { CrmProjectDetail } from '@/domain/crm';
import type { CrmProjectPreview } from '@/domain/crm/projectPreview';

export function projectPreviewFromDetail(project: CrmProjectDetail): CrmProjectPreview {
  return {
    summary: project.summary,
    notes: project.notes,
  };
}
