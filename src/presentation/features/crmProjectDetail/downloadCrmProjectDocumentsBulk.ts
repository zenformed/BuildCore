'use client';

import { isDemoRuntimeClient } from '@/infrastructure/runtime/buildCoreRuntime';
import {
  downloadCrmDocumentAttachmentPost,
} from '@/infrastructure/crm/api/downloadCrmDocumentAttachment';

export function buildCrmProjectDocumentsBulkDownloadApiPath(projectSlug: string): string {
  return `/api/crm/projects/${encodeURIComponent(projectSlug)}/documents/download`;
}

export type CrmProjectDocumentsBulkDownloadResult = 'downloaded' | 'demo_blocked';

export async function downloadCrmProjectDocumentsBulk(
  projectSlug: string,
  documentIds: readonly string[],
  fallbackFileName = 'documents.zip'
): Promise<CrmProjectDocumentsBulkDownloadResult> {
  if (isDemoRuntimeClient()) {
    return 'demo_blocked';
  }

  await downloadCrmDocumentAttachmentPost(
    buildCrmProjectDocumentsBulkDownloadApiPath(projectSlug),
    { documentIds: [...documentIds] },
    fallbackFileName
  );
  return 'downloaded';
}
