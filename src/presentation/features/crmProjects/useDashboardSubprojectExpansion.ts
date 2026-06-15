'use client';

import {
  useCallback,
  useEffect,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';
import type { CrmProjectSummary } from '@/domain/crm';

export type UseDashboardSubprojectExpansionInput = {
  readonly expandedParentIds?: ReadonlySet<string>;
  readonly onExpandedParentIdsChange?: Dispatch<SetStateAction<ReadonlySet<string>>>;
  readonly displayRoots: readonly CrmProjectSummary[];
  readonly allChildrenByParentId?: ReadonlyMap<string, readonly CrmProjectSummary[]>;
  readonly enableSubprojectExpansion: boolean;
  readonly autoExpandParentsWithSubprojects?: boolean;
};

export function useDashboardSubprojectExpansion({
  expandedParentIds: expandedParentIdsProp,
  onExpandedParentIdsChange,
  displayRoots,
  allChildrenByParentId,
  enableSubprojectExpansion,
  autoExpandParentsWithSubprojects = false,
}: UseDashboardSubprojectExpansionInput): {
  expandedParentIds: ReadonlySet<string>;
  toggleExpanded: (parentId: string) => void;
} {
  const [expandedParentIdsInternal, setExpandedParentIdsInternal] = useState<
    ReadonlySet<string>
  >(() => new Set());
  const expandedParentIds = expandedParentIdsProp ?? expandedParentIdsInternal;
  const setExpandedParentIds: Dispatch<SetStateAction<ReadonlySet<string>>> =
    onExpandedParentIdsChange ?? setExpandedParentIdsInternal;

  const toggleExpanded = useCallback(
    (parentId: string): void => {
      setExpandedParentIds((current) => {
        const next = new Set(current);
        if (next.has(parentId)) next.delete(parentId);
        else next.add(parentId);
        return next;
      });
    },
    [setExpandedParentIds]
  );

  useEffect(() => {
    if (!enableSubprojectExpansion || !autoExpandParentsWithSubprojects) {
      return;
    }

    setExpandedParentIds((current) => {
      const next = new Set(current);
      for (const project of displayRoots) {
        const childCount = allChildrenByParentId?.get(project.id)?.length ?? 0;
        if (childCount > 0) {
          next.add(project.id);
        }
      }
      return next;
    });
  }, [
    allChildrenByParentId,
    autoExpandParentsWithSubprojects,
    displayRoots,
    enableSubprojectExpansion,
    setExpandedParentIds,
  ]);

  return { expandedParentIds, toggleExpanded };
}
