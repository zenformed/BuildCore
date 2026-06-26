import { DEMO_DOCUMENT_DOWNLOAD_LOCKED_MESSAGE } from '@/infrastructure/demo/demoSafetyPolicy';
import type { CrmProjectDocumentDownloadResult } from '@/presentation/features/crmProjectDetail/downloadCrmProjectDocument';

export function notifyCrmProjectDocumentDownloadResult(
  result: CrmProjectDocumentDownloadResult,
  handlers: {
    readonly onDemoDownloadBlocked: (message: string) => void;
    readonly onError: (message: string) => void;
  }
): void {
  if (result === 'demo_blocked') {
    handlers.onDemoDownloadBlocked(DEMO_DOCUMENT_DOWNLOAD_LOCKED_MESSAGE);
  }
}

export { DEMO_DOCUMENT_DOWNLOAD_LOCKED_MESSAGE };
