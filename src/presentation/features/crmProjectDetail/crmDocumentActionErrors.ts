import { STORAGE_LIMIT_EXCEEDED_CODE } from '@/domain/crm/documentUpload';
import { CrmApiError } from '@/infrastructure/crm/api/crmApiClient';
import { CrmDocumentServiceError } from '@/infrastructure/crm/errors';

type WorkflowDocumentMessages = {
  readonly documentUploadFailed: string;
  readonly storageLimitExceeded: string;
  readonly coreServicesUnavailable: string;
};

export function mapCrmDocumentActionError(
  err: unknown,
  messages: WorkflowDocumentMessages
): string {
  if (err instanceof CrmDocumentServiceError) {
    if (err.code === STORAGE_LIMIT_EXCEEDED_CODE) {
      return messages.storageLimitExceeded;
    }
    return err.message;
  }
  if (err instanceof CrmApiError) {
    if (err.code === STORAGE_LIMIT_EXCEEDED_CODE) {
      return messages.storageLimitExceeded;
    }
    if (err.code === 'misconfigured' || err.status === 502 || err.status === 503) {
      return messages.coreServicesUnavailable;
    }
    return err.message;
  }
  if (err instanceof Error) {
    if (
      err.message === 'zenformed_core_unconfigured' ||
      err.message === 'zenformed_core_storage_unavailable'
    ) {
      return messages.coreServicesUnavailable;
    }
    return err.message;
  }
  return messages.documentUploadFailed;
}
