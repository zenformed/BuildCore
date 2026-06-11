import { getProjectIndustryDisplayLabel } from './industry';
import type { CrmProjectSummary } from './project';
import { crmProjectAddressSearchText } from './projectAddress';

export function buildCrmProjectSummarySearchHaystack(project: CrmProjectSummary): string {
  return [
    project.name,
    project.client.name,
    project.contact.name,
    project.contact.email,
    project.contact.phone,
    crmProjectAddressSearchText(project.address),
    project.notesPreview,
    project.assignedTo?.displayName,
    getProjectIndustryDisplayLabel(project.industry, project.customIndustry),
    project.slug,
  ]
    .filter((value): value is string => typeof value === 'string' && value.length > 0)
    .join(' ')
    .toLowerCase();
}
