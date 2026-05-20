'use client';

import { createContext, useContext, type ReactElement, type ReactNode } from 'react';
import type { ProjectDetailPageContext } from './projectDetailPageContext';
import type { useProjectCompletionToggle } from './useProjectCompletionToggle';
import type { useProjectDetailWorkspace } from './useProjectDetailWorkspace';

export type ProjectDetailShellContextValue = {
  pageContext: ProjectDetailPageContext;
  isApiSource: boolean;
  onRefresh: () => Promise<void>;
  showCompletionActions: boolean;
  completion: ReturnType<typeof useProjectCompletionToggle> | null;
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
