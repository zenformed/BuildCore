'use client';

import { createContext, useContext, type ReactElement, type ReactNode } from 'react';
import type { ProjectDetailPageContext } from './projectDetailPageContext';
import type { useProjectCompletionToggle } from './useProjectCompletionToggle';
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

export type ProjectDetailShellContextValue = {
  pageContext: ProjectDetailPageContext;
  isApiSource: boolean;
  onRefresh: () => Promise<void>;
  showCompletionActions: boolean;
  isMemberRole: boolean;
  completion: ReturnType<typeof useProjectCompletionToggle> | null;
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
    throw new Error('useProjectDetailShell must be used within ProjectDetailShell');
  }
  return value;
}
