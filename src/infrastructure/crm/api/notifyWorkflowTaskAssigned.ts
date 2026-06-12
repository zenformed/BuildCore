import { crmApiPostJson } from '@/infrastructure/crm/api/crmApiClient';

export type NotifyWorkflowTaskAssignedResponse = {
  readonly ok: true;
  readonly emailDeliveryStatus: 'sent';
  readonly recipientKind?: 'customer' | 'member';
};

/** `POST /api/crm/tasks/:taskId/notify-assigned` */
export async function notifyWorkflowTaskAssigned(
  taskId: string
): Promise<NotifyWorkflowTaskAssignedResponse> {
  const encoded = encodeURIComponent(taskId);
  return crmApiPostJson<NotifyWorkflowTaskAssignedResponse>(
    `/api/crm/tasks/${encoded}/notify-assigned`,
    {}
  );
}
