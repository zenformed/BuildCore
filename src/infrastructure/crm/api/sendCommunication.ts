import { crmApiPostJson } from '@/infrastructure/crm/api/crmApiClient';
import type { CommunicationSendRequestBody } from '@/infrastructure/coreApi/buildCoreCommunicationClient';

export type SendCommunicationApiResponse = {
  readonly ok: true;
  readonly communicationRequestId: string;
  readonly deliveryStatus: 'sent';
  readonly providerMessageId: string | null;
  readonly error: null;
};

/** `POST /api/crm/communications/send` */
export async function sendCommunication(
  body: CommunicationSendRequestBody
): Promise<SendCommunicationApiResponse> {
  return crmApiPostJson<SendCommunicationApiResponse>('/api/crm/communications/send', body);
}
