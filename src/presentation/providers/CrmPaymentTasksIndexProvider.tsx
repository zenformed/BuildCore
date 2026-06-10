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
import type { CrmProjectBudgetEntriesIndex } from '@/domain/crm/projectBudgetRollup';
import type { CrmProjectPaymentTasksIndex } from '@/domain/crm/projectPaymentValue';
import {
  loadCrmProjectBudgetEntriesIndex,
  loadCrmProjectBudgetEntriesIndexSync,
} from '@/application/use-cases/crm/loadCrmProjectBudgetEntriesIndex';
import {
  loadCrmProjectPaymentTasksIndex,
  loadCrmProjectPaymentTasksIndexSync,
} from '@/application/use-cases/crm/loadCrmProjectPaymentTasksIndex';
import { getCrmDataSource } from '@/infrastructure/config/crmDataSource';
import { crmRepositories } from '@/shared/di/container';

export type CrmPaymentTasksIndexContextValue = {
  readonly paymentTasksIndex: CrmProjectPaymentTasksIndex;
  readonly budgetEntriesIndex: CrmProjectBudgetEntriesIndex;
  readonly isLoading: boolean;
  readonly refetch: () => Promise<void>;
};

const CrmPaymentTasksIndexContext = createContext<CrmPaymentTasksIndexContextValue | null>(null);

type FinancialRollupIndexes = {
  readonly paymentTasksIndex: CrmProjectPaymentTasksIndex;
  readonly budgetEntriesIndex: CrmProjectBudgetEntriesIndex;
};

let inFlightFinancialRollupIndexLoad: Promise<FinancialRollupIndexes> | null = null;

async function loadSharedFinancialRollupIndexes(
  isApiSource: boolean
): Promise<FinancialRollupIndexes> {
  if (!isApiSource) {
    return {
      paymentTasksIndex: loadCrmProjectPaymentTasksIndexSync(crmRepositories),
      budgetEntriesIndex: loadCrmProjectBudgetEntriesIndexSync(crmRepositories),
    };
  }
  if (inFlightFinancialRollupIndexLoad) {
    return inFlightFinancialRollupIndexLoad;
  }
  inFlightFinancialRollupIndexLoad = Promise.all([
    loadCrmProjectPaymentTasksIndex(crmRepositories),
    loadCrmProjectBudgetEntriesIndex(crmRepositories),
  ]).then(([paymentTasksIndex, budgetEntriesIndex]) => ({
    paymentTasksIndex,
    budgetEntriesIndex,
  }));
  try {
    return await inFlightFinancialRollupIndexLoad;
  } finally {
    inFlightFinancialRollupIndexLoad = null;
  }
}

export type CrmPaymentTasksIndexProviderProps = {
  readonly children: ReactNode;
};

export function CrmPaymentTasksIndexProvider({
  children,
}: CrmPaymentTasksIndexProviderProps): ReactElement {
  const isApiSource = getCrmDataSource() === 'api';
  const [rollupIndexes, setRollupIndexes] = useState<FinancialRollupIndexes | null>(() =>
    isApiSource
      ? null
      : {
          paymentTasksIndex: loadCrmProjectPaymentTasksIndexSync(crmRepositories),
          budgetEntriesIndex: loadCrmProjectBudgetEntriesIndexSync(crmRepositories),
        }
  );
  const mountedRef = useRef(true);

  const refetch = useCallback(async (): Promise<void> => {
    const indexes = await loadSharedFinancialRollupIndexes(isApiSource);
    if (mountedRef.current) {
      setRollupIndexes(indexes);
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
        paymentTasksIndex: rollupIndexes?.paymentTasksIndex ?? new Map<string, never>(),
        budgetEntriesIndex: rollupIndexes?.budgetEntriesIndex ?? new Map<string, never>(),
        isLoading: rollupIndexes === null,
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
