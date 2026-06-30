'use client';

import { useLayoutEffect, useState, type ReactElement, type ReactNode } from 'react';
import { hydrateMockCrmStateFromDemoSession } from '@/infrastructure/crm/mock/mockCrmMutationStore';
import { seedMockWorkflowTaskCustomFieldExamplesIfEmpty } from '@/infrastructure/crm/mock/mockWorkflowTaskCustomFieldsStore';
import { resetCrmRepositoriesCache } from '@/infrastructure/crm/crmRepositories';
import { loadOrCreateDemoSessionStore } from '@/infrastructure/demo/demoSessionStore';

export type DemoRuntimeBootstrapProps = {
  readonly children: ReactNode;
  readonly onSessionReady: (sessionId: string) => void;
};

/**
 * Hydrates demo CRM state from localStorage before rendering dashboard UI.
 */
export function DemoRuntimeBootstrap({
  children,
  onSessionReady,
}: DemoRuntimeBootstrapProps): ReactElement | null {
  const [ready, setReady] = useState(false);

  useLayoutEffect(() => {
    resetCrmRepositoriesCache();
    const store = loadOrCreateDemoSessionStore();
    hydrateMockCrmStateFromDemoSession(store);
    seedMockWorkflowTaskCustomFieldExamplesIfEmpty();
    onSessionReady(store.sessionId);
    setReady(true);
  }, [onSessionReady]);

  if (!ready) {
    return null;
  }

  return <>{children}</>;
}
