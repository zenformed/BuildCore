import type { BuildCoreProjectTemplateScope } from '@/domain/crm/projectTemplateScope';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';

export type ProjectTemplateScopeCopy =
  (typeof content.projectDetail.templates)[BuildCoreProjectTemplateScope];

export function getProjectTemplateScopeCopy(
  templateScope: BuildCoreProjectTemplateScope
): ProjectTemplateScopeCopy {
  return content.projectDetail.templates[templateScope];
}
