import type { CrmProjectSummary } from '@/domain/crm';
import type { CrmProjectPaymentTasksIndex, ProjectPaymentFinancials } from '@/domain/crm/projectPaymentValue';
import {
  resolveDashboardChildRowFinancials,
  resolveDashboardRootRowFinancials,
} from '@/presentation/features/crmProjects/projectPaymentFinancials';

export type CrmProjectsDashboardRowModel = {
  readonly key: string;
  readonly project: CrmProjectSummary;
  readonly variant: 'root' | 'child';
  readonly financials: ProjectPaymentFinancials;
  readonly valueLabel: string;
  readonly hasChildren: boolean;
  readonly isExpanded: boolean;
  readonly onToggleExpand: (() => void) | undefined;
  readonly onRowClick: () => void;
};

export type BuildCrmProjectsDashboardRowModelsInput = {
  readonly displayRoots: readonly CrmProjectSummary[];
  readonly enableSubprojectExpansion: boolean;
  readonly expandedParentIds: ReadonlySet<string>;
  readonly allChildrenByParentId?: ReadonlyMap<string, readonly CrmProjectSummary[]>;
  readonly visibleChildrenByParentId?: ReadonlyMap<string, readonly CrmProjectSummary[]>;
  readonly paymentTasksIndex: CrmProjectPaymentTasksIndex;
  readonly projectValueLabel: string;
  readonly subValueLabel: string;
  readonly onRowClick: (project: CrmProjectSummary) => void;
  readonly onSubprojectRowClick?: (parent: CrmProjectSummary, child: CrmProjectSummary) => void;
  readonly toggleExpanded: (parentId: string) => void;
};

export function buildCrmProjectsDashboardRowModels(
  input: BuildCrmProjectsDashboardRowModelsInput
): CrmProjectsDashboardRowModel[] {
  const {
    displayRoots,
    enableSubprojectExpansion,
    expandedParentIds,
    allChildrenByParentId,
    visibleChildrenByParentId,
    paymentTasksIndex,
    projectValueLabel,
    subValueLabel,
    onRowClick,
    onSubprojectRowClick,
    toggleExpanded,
  } = input;

  return displayRoots.flatMap((project) => {
    const childCount = allChildrenByParentId?.get(project.id)?.length ?? 0;
    const hasChildren = enableSubprojectExpansion && childCount > 0;
    const isExpanded = expandedParentIds.has(project.id);
    const visibleChildren = visibleChildrenByParentId?.get(project.id) ?? [];
    const isStandaloneChild = !enableSubprojectExpansion && project.parentProjectId != null;
    const rowFinancials = isStandaloneChild
      ? resolveDashboardChildRowFinancials(project, paymentTasksIndex)
      : resolveDashboardRootRowFinancials(project, visibleChildren, paymentTasksIndex);
    const rowVariant = isStandaloneChild ? 'child' : 'root';
    const rowValueLabel = isStandaloneChild ? subValueLabel : projectValueLabel;

    const rootModel: CrmProjectsDashboardRowModel = {
      key: project.id,
      project,
      variant: rowVariant,
      financials: rowFinancials,
      valueLabel: rowValueLabel,
      hasChildren,
      isExpanded,
      onToggleExpand: hasChildren ? () => toggleExpanded(project.id) : undefined,
      onRowClick: () => onRowClick(project),
    };

    if (!enableSubprojectExpansion || !isExpanded || visibleChildren.length === 0) {
      return [rootModel];
    }

    const childModels = visibleChildren.map((child) => ({
      key: child.id,
      project: child,
      variant: 'child' as const,
      financials: resolveDashboardChildRowFinancials(child, paymentTasksIndex),
      valueLabel: subValueLabel,
      hasChildren: false,
      isExpanded: false,
      onToggleExpand: undefined,
      onRowClick: () =>
        onSubprojectRowClick ? onSubprojectRowClick(project, child) : onRowClick(child),
    }));

    return [rootModel, ...childModels];
  });
}
