'use client';

import { downloadCrmDocumentAttachmentPost } from '@/infrastructure/crm/api/downloadCrmDocumentAttachment';

export async function downloadCrmOrganizationPhotos(
  documentIds: readonly string[]
): Promise<void> {
  await downloadCrmDocumentAttachmentPost(
    '/api/crm/photos/download',
    { documentIds: [...documentIds] },
    'photos.zip'
  );
}
