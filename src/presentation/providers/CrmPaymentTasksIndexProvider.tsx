'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import type { CrmProjectBudgetEntriesIndex } from '@/domain/crm/projectBudgetRollup';
import type { CrmProjectPaymentTasksIndex } from '@/domain/crm/projectPaymentValue';
import type { CrmProjectWorkflowTaskStatusIndex } from '@/domain/crm/projectWorkflowTaskStatusIndex';
import type { CrmProjectWorkflowProgressInputIndex } from '@/domain/crm/projectWorkflowProgressInput';
import {
  loadCrmProjectBudgetEntriesIndex,
  loadCrmProjectBudgetEntriesIndexSync,
} from '@/application/use-cases/crm/loadCrmProjectBudgetEntriesIndex';
import {
  loadCrmProjectPaymentTasksIndex,
  loadCrmProjectPaymentTasksIndexSync,
} from '@/application/use-cases/crm/loadCrmProjectPaymentTasksIndex';
import {
  loadCrmProjectWorkflowTaskStatusIndex,
  loadCrmProjectWorkflowTaskStatusIndexSync,
} from '@/application/use-cases/crm/loadCrmProjectWorkflowTaskStatusIndex';
import {
  loadCrmProjectWorkflowProgressInputIndex,
  loadCrmProjectWorkflowProgressInputIndexSync,
} from '@/application/use-cases/crm/loadCrmProjectWorkflowProgressInputIndex';
import { getCrmDataSource } from '@/infrastructure/config/crmDataSource';
import { deferNonCriticalWork } from '@/presentation/utils/deferNonCriticalWork';
import { crmRepositories } from '@/shared/di/container';

export type CrmPaymentTasksIndexContextValue = {
  readonly paymentTasksIndex: CrmProjectPaymentTasksIndex;
  readonly budgetEntriesIndex: CrmProjectBudgetEntriesIndex;
  readonly workflowTaskStatusIndex: CrmProjectWorkflowTaskStatusIndex;
  readonly workflowProgressInputIndex: CrmProjectWorkflowProgressInputIndex;
  readonly isLoading: boolean;
  readonly refetch: () => Promise<void>;
};

const CrmPaymentTasksIndexContext = createContext<CrmPaymentTasksIndexContextValue | null>(null);

type FinancialRollupIndexes = {
  readonly paymentTasksIndex: CrmProjectPaymentTasksIndex;
  readonly budgetEntriesIndex: CrmProjectBudgetEntriesIndex;
  readonly workflowTaskStatusIndex: CrmProjectWorkflowTaskStatusIndex;
  readonly workflowProgressInputIndex: CrmProjectWorkflowProgressInputIndex;
};

const EMPTY_PAYMENT_TASKS_INDEX: CrmProjectPaymentTasksIndex = new Map<string, never>();
const EMPTY_BUDGET_ENTRIES_INDEX: CrmProjectBudgetEntriesIndex = new Map<string, never>();
const EMPTY_WORKFLOW_TASK_STATUS_INDEX: CrmProjectWorkflowTaskStatusIndex = new Map<string, never>();
const EMPTY_WORKFLOW_PROGRESS_INPUT_INDEX: CrmProjectWorkflowProgressInputIndex = new Map<
  string,
  never
>();

let inFlightFinancialRollupIndexLoad: Promise<FinancialRollupIndexes> | null = null;

async function loadSharedFinancialRollupIndexes(
  isApiSource: boolean
): Promise<FinancialRollupIndexes> {
  if (!isApiSource) {
    return {
      paymentTasksIndex: loadCrmProjectPaymentTasksIndexSync(crmRepositories),
      budgetEntriesIndex: loadCrmProjectBudgetEntriesIndexSync(crmRepositories),
      workflowTaskStatusIndex: loadCrmProjectWorkflowTaskStatusIndexSync(crmRepositories),
      workflowProgressInputIndex: loadCrmProjectWorkflowProgressInputIndexSync(crmRepositories),
    };
  }
  if (inFlightFinancialRollupIndexLoad) {
    return inFlightFinancialRollupIndexLoad;
  }
  inFlightFinancialRollupIndexLoad = Promise.all([
    loadCrmProjectPaymentTasksIndex(crmRepositories),
    loadCrmProjectBudgetEntriesIndex(crmRepositories),
    loadCrmProjectWorkflowTaskStatusIndex(crmRepositories),
    loadCrmProjectWorkflowProgressInputIndex(crmRepositories),
  ]).then(([paymentTasksIndex, budgetEntriesIndex, workflowTaskStatusIndex, workflowProgressInputIndex]) => ({
    paymentTasksIndex,
    budgetEntriesIndex,
    workflowTaskStatusIndex,
    workflowProgressInputIndex,
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
          workflowTaskStatusIndex: loadCrmProjectWorkflowTaskStatusIndexSync(crmRepositories),
          workflowProgressInputIndex: loadCrmProjectWorkflowProgressInputIndexSync(crmRepositories),
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
    const cancelDefer = deferNonCriticalWork(() => {
      void refetch();
    });
    return () => {
      mountedRef.current = false;
      cancelDefer();
    };
  }, [isApiSource, refetch]);

  const contextValue = useMemo(
    (): CrmPaymentTasksIndexContextValue => ({
      paymentTasksIndex: rollupIndexes?.paymentTasksIndex ?? EMPTY_PAYMENT_TASKS_INDEX,
      budgetEntriesIndex: rollupIndexes?.budgetEntriesIndex ?? EMPTY_BUDGET_ENTRIES_INDEX,
      workflowTaskStatusIndex:
        rollupIndexes?.workflowTaskStatusIndex ?? EMPTY_WORKFLOW_TASK_STATUS_INDEX,
      workflowProgressInputIndex:
        rollupIndexes?.workflowProgressInputIndex ?? EMPTY_WORKFLOW_PROGRESS_INPUT_INDEX,
      isLoading: rollupIndexes === null,
      refetch,
    }),
    [refetch, rollupIndexes]
  );

  return (
    <CrmPaymentTasksIndexContext.Provider value={contextValue}>
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
