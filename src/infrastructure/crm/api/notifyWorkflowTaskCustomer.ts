import { crmApiPostJson } from '@/infrastructure/crm/api/crmApiClient';
import { shouldSimulateDemoOperation } from '@/infrastructure/demo/demoSafetyPolicy';

export type NotifyWorkflowTaskCustomerResponse = {
  readonly ok: true;
  readonly emailDeliveryStatus: 'sent';
};

/** `POST /api/crm/tasks/:taskId/notify-customer` */
export async function notifyWorkflowTaskCustomer(
  taskId: string
): Promise<NotifyWorkflowTaskCustomerResponse> {
  if (shouldSimulateDemoOperation('customer-notification')) {
    return { ok: true, emailDeliveryStatus: 'sent' };
  }

  const encoded = encodeURIComponent(taskId);
  return crmApiPostJson<NotifyWorkflowTaskCustomerResponse>(
    `/api/crm/tasks/${encoded}/notify-customer`,
    {}
  );
}
