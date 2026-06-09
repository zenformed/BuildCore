'use client';

import { useCallback, useEffect, useState } from 'react';
import type { CrmProjectPaymentTasksIndex } from '@/domain/crm/projectPaymentValue';
import {
  loadCrmProjectPaymentTasksIndex,
  loadCrmProjectPaymentTasksIndexSync,
} from '@/application/use-cases/crm/loadCrmProjectPaymentTasksIndex';
import { getCrmDataSource } from '@/infrastructure/config/crmDataSource';
import { crmRepositories } from '@/shared/di/container';

export function useCrmProjectPaymentTasksIndex(): {
  paymentTasksIndex: CrmProjectPaymentTasksIndex;
  isLoading: boolean;
  refetch: () => Promise<void>;
} {
  const isApiSource = getCrmDataSource() === 'api';
  const [paymentTasksIndex, setPaymentTasksIndex] = useState<CrmProjectPaymentTasksIndex | null>(
    () => (isApiSource ? null : loadCrmProjectPaymentTasksIndexSync(crmRepositories))
  );

  const loadIndex = useCallback(async (): Promise<void> => {
    if (!isApiSource) {
      setPaymentTasksIndex(loadCrmProjectPaymentTasksIndexSync(crmRepositories));
      return;
    }
    const index = await loadCrmProjectPaymentTasksIndex(crmRepositories);
    setPaymentTasksIndex(index);
  }, [isApiSource]);

  useEffect(() => {
    if (!isApiSource) return;
    void loadIndex();
  }, [isApiSource, loadIndex]);

  return {
    paymentTasksIndex: paymentTasksIndex ?? new Map<string, never>(),
    isLoading: paymentTasksIndex === null,
    refetch: loadIndex,
  };
}
