'use client';

import { createContext, useContext, type ReactElement, type ReactNode } from 'react';
import { useBuildCoreAssignmentCatalog } from '@/presentation/features/crmAssignment/useBuildCoreAssignmentCatalog';
import type { AssignmentIdentityCatalog } from '@/presentation/features/crmAssignment/assignmentIdentityModel';

type AssignmentIdentityContextValue = {
  readonly catalog: AssignmentIdentityCatalog | null;
  readonly isLoading: boolean;
  readonly loadError: string | null;
};

const AssignmentIdentityContext = createContext<AssignmentIdentityContextValue>({
  catalog: null,
  isLoading: false,
  loadError: null,
});

export type AssignmentIdentityProviderProps = {
  children: ReactNode;
};

export function AssignmentIdentityProvider({ children }: AssignmentIdentityProviderProps): ReactElement {
  const value = useBuildCoreAssignmentCatalog();

  return (
    <AssignmentIdentityContext.Provider value={value}>
      {children}
    </AssignmentIdentityContext.Provider>
  );
}

export function useAssignmentIdentityCatalog(): AssignmentIdentityCatalog | null {
  return useContext(AssignmentIdentityContext).catalog;
}

export function useAssignmentIdentityState(): AssignmentIdentityContextValue {
  return useContext(AssignmentIdentityContext);
}
