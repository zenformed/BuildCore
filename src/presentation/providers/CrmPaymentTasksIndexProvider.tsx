'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import type { CrmProjectPaymentTasksIndex } from '@/domain/crm/projectPaymentValue';
import {
  loadCrmProjectPaymentTasksIndex,
  loadCrmProjectPaymentTasksIndexSync,
} from '@/application/use-cases/crm/loadCrmProjectPaymentTasksIndex';
import { getCrmDataSource } from '@/infrastructure/config/crmDataSource';
import { crmRepositories } from '@/shared/di/container';

export type CrmPaymentTasksIndexContextValue = {
  readonly paymentTasksIndex: CrmProjectPaymentTasksIndex;
  readonly isLoading: boolean;
  readonly refetch: () => Promise<void>;
};

const CrmPaymentTasksIndexContext = createContext<CrmPaymentTasksIndexContextValue | null>(null);

let inFlightPaymentIndexLoad: Promise<CrmProjectPaymentTasksIndex> | null = null;

async function loadSharedPaymentTasksIndex(
  isApiSource: boolean
): Promise<CrmProjectPaymentTasksIndex> {
  if (!isApiSource) {
    return loadCrmProjectPaymentTasksIndexSync(crmRepositories);
  }
  if (inFlightPaymentIndexLoad) {
    return inFlightPaymentIndexLoad;
  }
  inFlightPaymentIndexLoad = loadCrmProjectPaymentTasksIndex(crmRepositories);
  try {
    return await inFlightPaymentIndexLoad;
  } finally {
    inFlightPaymentIndexLoad = null;
  }
}

export type CrmPaymentTasksIndexProviderProps = {
  readonly children: ReactNode;
};

export function CrmPaymentTasksIndexProvider({
  children,
}: CrmPaymentTasksIndexProviderProps): ReactElement {
  const isApiSource = getCrmDataSource() === 'api';
  const [paymentTasksIndex, setPaymentTasksIndex] = useState<CrmProjectPaymentTasksIndex | null>(
    () => (isApiSource ? null : loadCrmProjectPaymentTasksIndexSync(crmRepositories))
  );
  const mountedRef = useRef(true);

  const refetch = useCallback(async (): Promise<void> => {
    const index = await loadSharedPaymentTasksIndex(isApiSource);
    if (mountedRef.current) {
      setPaymentTasksIndex(index);
    }
  }, [isApiSource]);

  useEffect(() => {
    mountedRef.current = true;
    if (!isApiSource) return;
    void refetch();
    return () => {
      mountedRef.current = false;
    };
  }, [isApiSource, refetch]);

  return (
    <CrmPaymentTasksIndexContext.Provider
      value={{
        paymentTasksIndex: paymentTasksIndex ?? new Map<string, never>(),
        isLoading: paymentTasksIndex === null,
        refetch,
      }}
    >
      {children}
    </CrmPaymentTasksIndexContext.Provider>
  );
}

export function useCrmPaymentTasksIndexContext(): CrmPaymentTasksIndexContextValue {
  const value = useContext(CrmPaymentTasksIndexContext);
  if (value == null) {
    throw new Error(
      'useCrmPaymentTasksIndexContext must be used within CrmPaymentTasksIndexProvider'
    );
  }
  return value;
}
