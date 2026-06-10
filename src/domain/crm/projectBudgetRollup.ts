import {
  buildProjectBudgetSummary,
  type CrmBudgetEntry,
  type CrmProjectBudgetSummary,
} from './budget';
import type { CrmProjectSummary } from './project';

export type CrmProjectBudgetEntriesIndex = ReadonlyMap<string, readonly CrmBudgetEntry[]>;

export function getBudgetEntriesForProject(
  index: CrmProjectBudgetEntriesIndex,
  projectId: string
): readonly CrmBudgetEntry[] {
  return index.get(projectId) ?? [];
}

/** Parent budget entries plus budget entries for each visible child project. */
export function collectRollupBudgetSummary(
  parentBudget: CrmProjectBudgetSummary,
  childSummaries: readonly CrmProjectSummary[],
  budgetEntriesIndex: CrmProjectBudgetEntriesIndex
): CrmProjectBudgetSummary {
  const childEntries = childSummaries.flatMap((child) =>
    getBudgetEntriesForProject(budgetEntriesIndex, child.id)
  );
  return buildProjectBudgetSummary([...parentBudget.entries, ...childEntries]);
}
