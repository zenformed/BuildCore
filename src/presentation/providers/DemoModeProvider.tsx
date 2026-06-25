'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import type { SignInResult, SignUpResult } from '@/application/ports/IAuthService';
import type { User } from '@/domain/entities/User';
import type { UseAuthState } from '@/presentation/hooks/useAuth';
import type { UseUserAvatarState } from '@/presentation/hooks/useUserAvatar';
import type { BuildCoreRuntime } from '@/infrastructure/runtime/buildCoreRuntime';
import { clearDemoCrmSession, hydrateMockCrmStateFromDemoSession } from '@/infrastructure/crm/mock/mockCrmMutationStore';
import { resetCrmRepositoriesCache } from '@/infrastructure/crm/crmRepositories';
import { createDemoDomainUser } from '@/infrastructure/demo/demoProfileFixtures';
import { createDemoSessionId } from '@/infrastructure/demo/demoSessionStore';

export const DEMO_RESET_EVENT = 'buildcore:demo-reset';

export type DemoModeContextValue = {
  readonly runtime: BuildCoreRuntime;
  readonly isActive: true;
  readonly sessionId: string;
  readonly resetVersion: number;
  readonly auth: UseAuthState;
  readonly avatar: UseUserAvatarState;
  readonly resetDemo: () => void;
};

const DemoModeContext = createContext<DemoModeContextValue | null>(null);

function createDemoAuthState(user: User): UseAuthState {
  return {
    user,
    isLoading: false,
    signIn: async (): Promise<SignInResult> => ({
      success: true,
      user,
    }),
    signUp: async (): Promise<SignUpResult> => ({
      success: true,
      user,
    }),
    waitForSessionSync: async () => {},
    signOut: async () => {},
  };
}

const DEMO_AVATAR_STATE: UseUserAvatarState = {
  avatarUrl: null,
  hasPhoto: false,
  isLoading: false,
  refetch: async () => {},
};

export type DemoModeProviderProps = {
  readonly sessionId: string;
  readonly children: ReactNode;
};

export function DemoModeProvider({ sessionId, children }: DemoModeProviderProps): ReactElement {
  const [resetVersion, setResetVersion] = useState(0);
  const demoUser = useMemo(() => createDemoDomainUser(), []);

  const resetDemo = useCallback(() => {
    clearDemoCrmSession();
    resetCrmRepositoriesCache();
    const nextSessionId = createDemoSessionId();
    hydrateMockCrmStateFromDemoSession({
      sessionId: nextSessionId,
      projectOverrides: new Map(),
      archivedSlugs: [],
      pipelineStages: null,
    });
    setResetVersion((version) => version + 1);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(DEMO_RESET_EVENT, { detail: { sessionId: nextSessionId } }));
    }
  }, []);

  const auth = useMemo(() => createDemoAuthState(demoUser), [demoUser]);

  const value = useMemo<DemoModeContextValue>(
    () => ({
      runtime: 'DEMO',
      isActive: true,
      sessionId,
      resetVersion,
      auth,
      avatar: DEMO_AVATAR_STATE,
      resetDemo,
    }),
    [auth, resetDemo, resetVersion, sessionId]
  );

  return <DemoModeContext.Provider value={value}>{children}</DemoModeContext.Provider>;
}

export function useDemoMode(): DemoModeContextValue {
  const ctx = useContext(DemoModeContext);
  if (ctx == null) {
    throw new Error('useDemoMode must be used within DemoModeProvider');
  }
  return ctx;
}

export function useOptionalDemoMode(): DemoModeContextValue | null {
  return useContext(DemoModeContext);
}

export function createInitialDemoSessionId(): string {
  return createDemoSessionId();
}