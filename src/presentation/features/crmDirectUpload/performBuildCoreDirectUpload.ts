'use client';

import { validateBuildCoreUpload } from '@/domain/crm/buildCoreUploadPolicy';
import { shouldSimulateDemoOperation } from '@/infrastructure/demo/demoSafetyPolicy';
import { simulateDemoDocumentUpload } from '@/infrastructure/demo/demoSimulatedDocumentUpload';
import { uploadFileToSignedUrl } from '@/infrastructure/coreApi/buildCoreDirectUploadClient';
import { getSession } from '@/infrastructure/supabase/supabaseClient';

export type CrmDirectUploadScope =
  | { readonly scope: 'workflow_task'; readonly projectSlug: string; readonly workflowTaskId: string }
  | { readonly scope: 'budget_entry'; readonly projectSlug: string; readonly budgetEntryId: string }
  | { readonly scope: 'project_media'; readonly projectSlug: string };

export type DirectUploadPrepared = {
  readonly documentId: string;
  readonly uploadUrl: string;
  readonly mimeType: string;
};

export async function performCrmDirectUpload(
  file: File,
  uploadScope: CrmDirectUploadScope
): Promise<DirectUploadPrepared & { readonly fileName: string }> {
  const validation = validateBuildCoreUpload({
    fileName: file.name,
    mimeType: file.type || 'application/octet-stream',
    sizeBytes: file.size,
  });
  if (!validation.ok) {
    throw new Error(validation.message);
  }

  if (shouldSimulateDemoOperation('crm-direct-upload')) {
    const simulated = await simulateDemoDocumentUpload(file, uploadScope);
    return {
      documentId: simulated.documentId,
      uploadUrl: 'demo://local',
      mimeType: simulated.mimeType,
      fileName: simulated.fileName,
    };
  }

  const session = await getSession();
  const token = session?.access_token;
  if (token == null || token.trim() === '') {
    throw new Error('You must be signed in to upload files.');
  }

  const prepareResponse = await fetch(
    `/api/crm/projects/${encodeURIComponent(uploadScope.projectSlug)}/direct-uploads/prepare`,
    {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        ...uploadScope,
        fileName: file.name,
        mimeType: file.type || 'application/octet-stream',
        sizeBytes: file.size,
      }),
    }
  );

  const prepareBody = (await prepareResponse.json()) as {
    documentId?: string;
    uploadUrl?: string;
    mimeType?: string;
    message?: string;
  };
  if (!prepareResponse.ok) {
    throw new Error(prepareBody.message ?? 'Could not prepare upload.');
  }
  if (prepareBody.documentId == null || prepareBody.uploadUrl == null) {
    throw new Error('Could not prepare upload.');
  }

  await uploadFileToSignedUrl(file, prepareBody.uploadUrl, prepareBody.mimeType ?? file.type);

  const finalizeResponse = await fetch(
    `/api/crm/projects/${encodeURIComponent(uploadScope.projectSlug)}/direct-uploads/${encodeURIComponent(prepareBody.documentId)}/finalize`,
    {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    }
  );
  const finalizeBody = (await finalizeResponse.json()) as { message?: string };
  if (!finalizeResponse.ok) {
    throw new Error(finalizeBody.message ?? 'Could not finalize upload.');
  }

  return {
    documentId: prepareBody.documentId,
    uploadUrl: prepareBody.uploadUrl,
    mimeType: prepareBody.mimeType ?? file.type,
    fileName: file.name,
  };
}

export async function performCustomerPortalDirectUpload(
  token: string,
  file: File
): Promise<{ readonly documentId: string; readonly fileName: string }> {
  const validation = validateBuildCoreUpload({
    fileName: file.name,
    mimeType: file.type || 'application/octet-stream',
    sizeBytes: file.size,
  });
  if (!validation.ok) {
    throw new Error(validation.message);
  }

  const prepareResponse = await fetch(
    `/api/customer-task/${encodeURIComponent(token)}/direct-uploads/prepare`,
    {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: file.name,
        mimeType: file.type || 'application/octet-stream',
        sizeBytes: file.size,
      }),
    }
  );
  const prepareBody = (await prepareResponse.json()) as {
    documentId?: string;
    uploadUrl?: string;
    mimeType?: string;
    message?: string;
  };
  if (!prepareResponse.ok) {
    throw new Error(prepareBody.message ?? 'Could not prepare upload.');
  }
  if (prepareBody.documentId == null || prepareBody.uploadUrl == null) {
    throw new Error('Could not prepare upload.');
  }

  await uploadFileToSignedUrl(file, prepareBody.uploadUrl, prepareBody.mimeType ?? file.type);

  const finalizeResponse = await fetch(
    `/api/customer-task/${encodeURIComponent(token)}/direct-uploads/${encodeURIComponent(prepareBody.documentId)}/finalize`,
    { method: 'POST', headers: { Accept: 'application/json' } }
  );
  const finalizeBody = (await finalizeResponse.json()) as { message?: string; fileName?: string };
  if (!finalizeResponse.ok) {
    throw new Error(finalizeBody.message ?? 'Could not finalize upload.');
  }

  return { documentId: prepareBody.documentId, fileName: finalizeBody.fileName ?? file.name };
}
