import type { CrmContact, CrmProjectDetail, CrmProjectSummary } from '@/domain/crm';
import { getProjectIndustryDisplayLabel } from '@/domain/crm/industry';
import { isPaymentWorkflowTask } from '@/domain/crm/paymentWorkflow';
import { formatCrmProjectAddressLine } from '@/domain/crm/projectAddress';
import { reportBudgetCategoryLabel } from '@/reports/labels/reportLabels';
import { formatReportCurrency, formatReportShortDate, formatReportText } from '@/reports/formatReportValues';
import { formatWorkflowStatus } from '@/presentation/features/crmProjectDetail/crmProjectDetailFormatters';
import type {
  OrganizationExportBuildInput,
  OrganizationExportSheet,
  OrganizationExportWorkbook,
} from './organizationExportTypes';

function resolveHierarchyLabels(
  summary: CrmProjectSummary,
  summaryById: ReadonlyMap<string, CrmProjectSummary>
): { projectLabel: string; subprojectLabel: string } {
  if (summary.parentProjectId != null) {
    const parent = summaryById.get(summary.parentProjectId);
    return {
      projectLabel: parent?.name ?? '—',
      subprojectLabel: summary.name,
    };
  }
  return { projectLabel: summary.name, subprojectLabel: '' };
}

function projectStatusLabel(summary: CrmProjectSummary): string {
  return summary.completedAt != null ? 'Complete' : 'Active';
}

function stageLabelForProject(
  summary: CrmProjectSummary,
  stageLabelBySlug: ReadonlyMap<string, string>
): string {
  return stageLabelBySlug.get(summary.currentStageSlug) ?? summary.currentStageSlug;
}

function assigneeLabel(
  assignee: { readonly displayName: string } | null | undefined
): string {
  return formatReportText(assignee?.displayName);
}

function buildProjectsSheet(input: OrganizationExportBuildInput): OrganizationExportSheet {
  const summaryById = new Map(input.projects.map((project) => [project.summary.id, project.summary]));

  const rows = input.projects.map((project) => {
    const { projectLabel, subprojectLabel } = resolveHierarchyLabels(project.summary, summaryById);
    const timestamps = input.projectTimestampsById.get(project.summary.id);
    return [
      projectLabel,
      subprojectLabel,
      formatReportText(project.summary.client.name),
      getProjectIndustryDisplayLabel(project.summary.industry, project.summary.customIndustry),
      stageLabelForProject(project.summary, input.stageLabelBySlug),
      assigneeLabel(project.summary.assignedTo),
      projectStatusLabel(project.summary),
      formatReportShortDate(timestamps?.createdAt ?? null),
      formatReportShortDate(timestamps?.updatedAt ?? project.summary.lastUpdatedAt),
    ];
  });

  return {
    name: 'Projects',
    headers: [
      'Project',
      'Subproject',
      'Customer',
      'Industry',
      'Stage',
      'Assigned',
      'Status',
      'Created',
      'Updated',
    ],
    rows,
  };
}

function buildWorkflowTasksSheet(input: OrganizationExportBuildInput): OrganizationExportSheet {
  const summaryById = new Map(input.projects.map((project) => [project.summary.id, project.summary]));
  const rows: string[][] = [];

  for (const project of input.projects) {
    const { projectLabel, subprojectLabel } = resolveHierarchyLabels(project.summary, summaryById);
    for (const task of project.workflowTasks) {
      if (isPaymentWorkflowTask(task)) continue;
      rows.push([
        projectLabel,
        subprojectLabel,
        formatReportText(task.title),
        assigneeLabel(task.assignedTo),
        formatWorkflowStatus(task.status),
        formatReportShortDate(task.dueAt),
        formatReportText(task.notes),
      ]);
    }
  }

  return {
    name: 'Workflow Tasks',
    headers: ['Project', 'Subproject', 'Task', 'Assignee', 'Status', 'Due Date', 'Notes'],
    rows,
  };
}

function buildPaymentsSheet(input: OrganizationExportBuildInput): OrganizationExportSheet {
  const summaryById = new Map(input.projects.map((project) => [project.summary.id, project.summary]));
  const rows: string[][] = [];

  for (const project of input.projects) {
    const { projectLabel, subprojectLabel } = resolveHierarchyLabels(project.summary, summaryById);
    for (const task of project.workflowTasks) {
      if (!isPaymentWorkflowTask(task)) continue;
      rows.push([
        projectLabel,
        subprojectLabel,
        formatReportText(task.title),
        formatReportCurrency(task.amountCents ?? 0),
        formatReportShortDate(task.invoicedAt),
        formatReportShortDate(task.paidAt),
      ]);
    }
  }

  return {
    name: 'Payments',
    headers: ['Project', 'Subproject', 'Payment Name', 'Amount', 'Invoiced Date', 'Paid Date'],
    rows,
  };
}

function buildBudgetEntriesSheet(input: OrganizationExportBuildInput): OrganizationExportSheet {
  const summaryById = new Map(input.projects.map((project) => [project.summary.id, project.summary]));
  const rows: string[][] = [];

  for (const project of input.projects) {
    const { projectLabel, subprojectLabel } = resolveHierarchyLabels(project.summary, summaryById);
    for (const entry of project.budget.entries) {
      rows.push([
        projectLabel,
        subprojectLabel,
        reportBudgetCategoryLabel(entry.category),
        formatReportCurrency(entry.costCents),
        formatReportText(entry.notes),
        formatReportShortDate(entry.costIncurredAt),
      ]);
    }
  }

  return {
    name: 'Budget Entries',
    headers: ['Project', 'Subproject', 'Category', 'Cost', 'Notes', 'Date'],
    rows,
  };
}

function buildTeamMembersSheet(input: OrganizationExportBuildInput): OrganizationExportSheet {
  return {
    name: 'Team Members',
    headers: ['Name', 'Email', 'Role'],
    rows: input.teamMembers.map((member) => [member.name, member.email, member.role]),
  };
}

function buildCustomersSheet(projects: readonly CrmProjectDetail[]): OrganizationExportSheet {
  const customersById = new Map<string, CrmContact>();

  for (const project of projects) {
    const contact = project.summary.contact;
    if (!customersById.has(contact.id)) {
      customersById.set(contact.id, contact);
    }
  }

  const rows = [...customersById.values()]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((contact) => {
      const project = projects.find((item) => item.summary.contact.id === contact.id);
      const address = project ? formatCrmProjectAddressLine(project.summary.address) : null;
      return [
        formatReportText(contact.name),
        formatReportText(contact.email),
        formatReportText(contact.phone),
        formatReportText(address),
      ];
    });

  return {
    name: 'Customers',
    headers: ['Name', 'Email', 'Phone', 'Address'],
    rows,
  };
}

export function buildOrganizationExportWorkbook(input: OrganizationExportBuildInput): OrganizationExportWorkbook {
  return {
    sheets: [
      buildProjectsSheet(input),
      buildWorkflowTasksSheet(input),
      buildPaymentsSheet(input),
      buildBudgetEntriesSheet(input),
      buildTeamMembersSheet(input),
      buildCustomersSheet(input.projects),
    ],
  };
}
