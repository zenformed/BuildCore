'use client';

import { useCrmPaymentTasksIndexContext } from '@/presentation/providers/CrmPaymentTasksIndexProvider';

export function useCrmProjectPaymentTasksIndex(): {
  paymentTasksIndex: ReturnType<typeof useCrmPaymentTasksIndexContext>['paymentTasksIndex'];
  isLoading: boolean;
  refetch: () => Promise<void>;
} {
  const { paymentTasksIndex, isLoading, refetch } = useCrmPaymentTasksIndexContext();
  return { paymentTasksIndex, isLoading, refetch };
}
