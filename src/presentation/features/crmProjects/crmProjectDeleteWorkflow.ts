import type { CrmProjectSummary } from '@/domain/crm';

export function formatCrmProjectDeleteWorkflowItemLabel(project: CrmProjectSummary): string {
  const projectName = project.name.trim();
  const customerName = project.client.name.trim();

  if (customerName.length === 0 || projectName.localeCompare(customerName, undefined, { sensitivity: 'accent' }) === 0) {
    return projectName;
  }

  return `${projectName} / ${customerName}`;
}

export type CrmProjectDeleteWorkflowCopy = {
  readonly title: string;
  readonly itemLabel: string;
  readonly intentActionLabel: string;
  readonly finalActionLabel: string;
  readonly consequenceDescription: string;
  readonly affectedDataSummary: string;
};
