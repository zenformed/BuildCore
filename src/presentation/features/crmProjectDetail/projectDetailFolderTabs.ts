import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';

export type ProjectDetailFolderTabId =
  | 'workflow'
  | 'budget'
  | 'payments'
  | 'documents'
  | 'financials'
  | 'accountability';

export type ProjectDetailFolderTabDef = {
  readonly id: ProjectDetailFolderTabId;
  readonly label: string;
};

export function buildProjectDetailFolderTabs(input: {
  readonly isMemberRole: boolean;
  readonly paymentIsReady: boolean;
  readonly paymentCanView: boolean;
  readonly budgetIsReady: boolean;
  readonly budgetCanView: boolean;
}): readonly ProjectDetailFolderTabDef[] {
  const detail = content.projectDetail;
  const items: ProjectDetailFolderTabDef[] = [
    { id: 'workflow', label: detail.actions.workflowTasks },
  ];

  if (input.paymentIsReady && input.paymentCanView) {
    items.push({ id: 'payments', label: detail.payments.title });
  }
  if (input.budgetIsReady && input.budgetCanView) {
    items.push({ id: 'budget', label: detail.budget.tableTitle });
  }
  if (!input.isMemberRole) {
    items.push({ id: 'documents', label: detail.sections.documents });
    items.push({ id: 'financials', label: 'Reports' });
    items.push({ id: 'accountability', label: detail.actions.accountability });
  }

  return items;
}
