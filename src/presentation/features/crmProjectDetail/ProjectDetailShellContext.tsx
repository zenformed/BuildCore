'use client';

import { createContext, useContext, type ReactElement, type ReactNode } from 'react';
import type { ProjectDetailPageContext } from './projectDetailPageContext';
import type { useProjectCompletionToggle } from './useProjectCompletionToggle';
import type { useCrmProjectStatusChange } from './useCrmProjectStatusChange';
import type { useProjectDetailWorkspace } from './useProjectDetailWorkspace';
import type { CrmProjectSummary } from '@/domain/crm';
import type { ProjectDetailRoutes } from '@/platform/navigation/projectDetailRoutes';

export type ProjectDetailChildSummaries = {
  readonly allRows: readonly CrmProjectSummary[];
  readonly isLoading: boolean;
  readonly refetch: () => Promise<void>;
  readonly appendProjectSummary: (summary: CrmProjectSummary) => void;
  readonly patchProjectSummary: (summary: CrmProjectSummary) => void;
};

export type ProjectDetailStatusChangeContext = {
  readonly canChange: boolean;
  readonly busy: boolean;
  readonly requestStatus: ReturnType<typeof useCrmProjectStatusChange>['requestStatus'];
};

export type ProjectDetailShellContextValue = {
  pageContext: ProjectDetailPageContext;
  isApiSource: boolean;
  onRefresh: () => Promise<void>;
  /** @deprecated Detail completion actions removed; always false. Kept for leftover callers. */
  showCompletionActions: boolean;
  isMemberRole: boolean;
  /** @deprecated Prefer projectStatus; completion toggle no longer drives detail UI. */
  completion: ReturnType<typeof useProjectCompletionToggle> | null;
  /** Detail-page Project/Subproject status pill control. */
  projectStatus: ProjectDetailStatusChangeContext | null;
  parentRouteSlug: string;
  subSlug?: string;
  parentProject: CrmProjectSummary | null;
  routes: ProjectDetailRoutes;
  /** Loaded on parent /slug overview only; shared by header progress + subprojects table. */
  childSummaries: ProjectDetailChildSummaries | null;
  /** True when the open project/subproject is marked inactive. */
  isProjectInactive: boolean;
  /** True when mutations must be blocked until the project is marked active. */
  projectMutationsLocked: boolean;
  /**
   * Run `onAllowed` immediately when the project is active.
   * When inactive, prompt to mark active; on success, run `onAllowed`.
   */
  guardProjectEdit: (onAllowed: () => void) => void;
} & ReturnType<typeof useProjectDetailWorkspace>;

const ProjectDetailShellContext = createContext<ProjectDetailShellContextValue | null>(null);

export type ProjectDetailShellProviderProps = {
  value: ProjectDetailShellContextValue;
  children: ReactNode;
};

export function ProjectDetailShellProvider({
  value,
  children,
}: ProjectDetailShellProviderProps): ReactElement {
  return (
    <ProjectDetailShellContext.Provider value={value}>{children}</ProjectDetailShellContext.Provider>
  );
}

export function useProjectDetailShell(): ProjectDetailShellContextValue {
  const value = useContext(ProjectDetailShellContext);
  if (value == null) {
    throw new Error('useProjectDetailShell must be used within ProjectDetailShellProvider');
  }
  return value;
}
