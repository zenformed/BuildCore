import {
  communicationSendErrorMessage,
  postBuildCoreCommunicationSend,
  type CommunicationSendRequestBody,
  type CommunicationSendResponse,
} from '@/infrastructure/coreApi/buildCoreCommunicationClient';
import type { CoreApiResult } from '@/infrastructure/coreApi/types';

export async function relayCommunicationSend(
  accessToken: string,
  organizationId: string,
  body: CommunicationSendRequestBody
): Promise<CoreApiResult<CommunicationSendResponse>> {
  return postBuildCoreCommunicationSend(accessToken, organizationId, body);
}

export { communicationSendErrorMessage };
