'use client';

import {
  BUILDCORE_UPLOAD_MAX_FILES_PER_BATCH,
  validateBuildCoreUpload,
} from '@/domain/crm/buildCoreUploadPolicy';
import { clearApiCrmDetailCache } from '@/infrastructure/crm/api/apiCrmDetailCache';
import { shouldSimulateDemoOperation } from '@/infrastructure/demo/demoSafetyPolicy';
import { simulateDemoDocumentUpload } from '@/infrastructure/demo/demoSimulatedDocumentUpload';
import {
  mapWithConcurrency,
  uploadFileToSignedUrl,
} from '@/infrastructure/coreApi/buildCoreDirectUploadClient';
import { getSession } from '@/infrastructure/supabase/supabaseClient';
import {
  resolveUploadCaptureLocations,
  type ResolvedUploadCaptureLocation,
  type UploadCaptureSource,
} from '@/presentation/features/crmDirectUpload/resolveUploadCaptureLocation';

export type CrmDirectUploadScope =
  | { readonly scope: 'workflow_task'; readonly projectSlug: string; readonly workflowTaskId: string }
  | { readonly scope: 'budget_entry'; readonly projectSlug: string; readonly budgetEntryId: string }
  | { readonly scope: 'project_media'; readonly projectSlug: string };

export type CrmDirectUploadOptions = {
  /** How the file was chosen. Camera triggers device geolocation; files use EXIF when present. */
  readonly captureSource?: UploadCaptureSource;
};

export type DirectUploadPrepared = {
  readonly documentId: string;
  readonly uploadUrl: string;
  readonly mimeType: string;
};

export type CrmDirectUploadFileProgressStatus =
  | 'waiting'
  | 'uploading'
  | 'complete'
  | 'failed'
  | 'skipped';

export type CrmDirectUploadFileProgress = {
  readonly clientFileId: string;
  readonly fileName: string;
  readonly status: CrmDirectUploadFileProgressStatus;
  readonly message?: string;
};

export type CrmDirectUploadBatchResult = {
  readonly succeeded: readonly {
    readonly clientFileId: string;
    readonly documentId: string;
    readonly fileName: string;
    readonly mimeType: string;
  }[];
  readonly failed: readonly {
    readonly clientFileId: string;
    readonly fileName: string;
    readonly file?: File;
    readonly documentId?: string;
    readonly message: string;
  }[];
  readonly skipped: readonly {
    readonly clientFileId: string;
    readonly fileName: string;
    readonly file?: File;
    readonly message: string;
  }[];
};

const STORAGE_UPLOAD_CONCURRENCY = 4;

type AcceptedBatchFile = {
  readonly clientFileId: string;
  readonly file: File;
  readonly location: ResolvedUploadCaptureLocation | null;
};

function locationFields(location: ResolvedUploadCaptureLocation | null) {
  if (location == null) return {};
  return {
    latitude: location.latitude,
    longitude: location.longitude,
    locationAccuracyMeters: location.locationAccuracyMeters,
    locationSource: location.locationSource,
    locationCapturedAt: location.locationCapturedAt,
  };
}

function createClientFileId(index: number): string {
  return `file-${index + 1}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Batch-first CRM direct upload: one prepare, concurrent storage PUTs, one finalize.
 */
export async function performCrmDirectUploads(input: {
  readonly files: readonly File[];
  readonly uploadScope: CrmDirectUploadScope;
  readonly options?: CrmDirectUploadOptions;
  readonly onFileProgress?: (progress: CrmDirectUploadFileProgress) => void;
}): Promise<CrmDirectUploadBatchResult> {
  const captureSource = input.options?.captureSource ?? 'files';
  const notify = input.onFileProgress;

  if (input.files.length === 0) {
    return { succeeded: [], failed: [], skipped: [] };
  }

  const skipped: CrmDirectUploadBatchResult['skipped'][number][] = [];
  const candidates: { clientFileId: string; file: File }[] = [];

  for (let index = 0; index < input.files.length; index += 1) {
    const file = input.files[index];
    const clientFileId = createClientFileId(index);
    if (candidates.length + skipped.length >= BUILDCORE_UPLOAD_MAX_FILES_PER_BATCH) {
      skipped.push({
        clientFileId,
        fileName: file.name,
        message: `You can upload at most ${BUILDCORE_UPLOAD_MAX_FILES_PER_BATCH} files at once.`,
      });
      notify?.({
        clientFileId,
        fileName: file.name,
        status: 'skipped',
        message: `You can upload at most ${BUILDCORE_UPLOAD_MAX_FILES_PER_BATCH} files at once.`,
      });
      continue;
    }

    const validation = validateBuildCoreUpload({
      fileName: file.name,
      mimeType: file.type || 'application/octet-stream',
      sizeBytes: file.size,
    });
    if (!validation.ok) {
      skipped.push({
        clientFileId,
        fileName: file.name,
        file,
        message: validation.message,
      });
      notify?.({
        clientFileId,
        fileName: file.name,
        status: 'skipped',
        message: validation.message,
      });
      continue;
    }

    candidates.push({ clientFileId, file });
    notify?.({ clientFileId, fileName: file.name, status: 'waiting' });
  }

  if (candidates.length === 0) {
    return { succeeded: [], failed: [], skipped };
  }

  const locations = await resolveUploadCaptureLocations(
    candidates.map((entry) => entry.file),
    captureSource
  );
  const accepted: AcceptedBatchFile[] = candidates.map((entry, index) => ({
    clientFileId: entry.clientFileId,
    file: entry.file,
    location: locations[index] ?? null,
  }));
  const acceptedByClientId = new Map(accepted.map((entry) => [entry.clientFileId, entry.file]));

  if (shouldSimulateDemoOperation('crm-direct-upload')) {
    const succeeded: CrmDirectUploadBatchResult['succeeded'][number][] = [];
    for (const entry of accepted) {
      notify?.({
        clientFileId: entry.clientFileId,
        fileName: entry.file.name,
        status: 'uploading',
      });
      const simulated = await simulateDemoDocumentUpload(
        entry.file,
        input.uploadScope,
        entry.location
      );
      succeeded.push({
        clientFileId: entry.clientFileId,
        documentId: simulated.documentId,
        fileName: simulated.fileName,
        mimeType: simulated.mimeType,
      });
      notify?.({
        clientFileId: entry.clientFileId,
        fileName: entry.file.name,
        status: 'complete',
      });
    }
    clearApiCrmDetailCache();
    return { succeeded, failed: [], skipped };
  }

  const session = await getSession();
  const token = session?.access_token;
  if (token == null || token.trim() === '') {
    throw new Error('You must be signed in to upload files.');
  }

  const prepareResponse = await fetch(
    `/api/crm/projects/${encodeURIComponent(input.uploadScope.projectSlug)}/direct-uploads/prepare`,
    {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        ...input.uploadScope,
        files: accepted.map((entry) => ({
          clientFileId: entry.clientFileId,
          fileName: entry.file.name,
          mimeType: entry.file.type || 'application/octet-stream',
          sizeBytes: entry.file.size,
          ...locationFields(entry.location),
        })),
      }),
    }
  );

  const prepareBody = (await prepareResponse.json()) as {
    uploads?: {
      clientFileId: string;
      documentId: string;
      uploadUrl: string;
      mimeType?: string;
    }[];
    message?: string;
  };
  if (!prepareResponse.ok) {
    throw new Error(prepareBody.message ?? 'Could not prepare upload.');
  }
  if (!Array.isArray(prepareBody.uploads) || prepareBody.uploads.length === 0) {
    throw new Error('Could not prepare upload.');
  }

  const preparedByClientId = new Map(
    prepareBody.uploads.map((upload) => [upload.clientFileId, upload])
  );

  type StorageOutcome = {
    clientFileId: string;
    documentId: string;
    fileName: string;
    mimeType: string;
    success: boolean;
    errorCode?: string;
    message?: string;
  };

  const storageOutcomes = await mapWithConcurrency(
    accepted,
    STORAGE_UPLOAD_CONCURRENCY,
    async (entry): Promise<StorageOutcome> => {
      const prepared = preparedByClientId.get(entry.clientFileId);
      if (prepared == null) {
        notify?.({
          clientFileId: entry.clientFileId,
          fileName: entry.file.name,
          status: 'failed',
          message: 'Prepare response missing this file.',
        });
        return {
          clientFileId: entry.clientFileId,
          documentId: '',
          fileName: entry.file.name,
          mimeType: entry.file.type || 'application/octet-stream',
          success: false,
          errorCode: 'prepare_missing',
          message: 'Prepare response missing this file.',
        };
      }

      notify?.({
        clientFileId: entry.clientFileId,
        fileName: entry.file.name,
        status: 'uploading',
      });

      try {
        await uploadFileToSignedUrl(
          entry.file,
          prepared.uploadUrl,
          prepared.mimeType ?? entry.file.type
        );
        return {
          clientFileId: entry.clientFileId,
          documentId: prepared.documentId,
          fileName: entry.file.name,
          mimeType: (prepared.mimeType ?? entry.file.type) || 'application/octet-stream',
          success: true,
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Direct upload to storage failed.';
        notify?.({
          clientFileId: entry.clientFileId,
          fileName: entry.file.name,
          status: 'failed',
          message,
        });
        return {
          clientFileId: entry.clientFileId,
          documentId: prepared.documentId,
          fileName: entry.file.name,
          mimeType: (prepared.mimeType ?? entry.file.type) || 'application/octet-stream',
          success: false,
          errorCode: 'storage_upload_failed',
          message,
        };
      }
    }
  );

  const finalizePayload = storageOutcomes
    .filter((outcome) => outcome.documentId)
    .map((outcome) => ({
      clientFileId: outcome.clientFileId,
      documentId: outcome.documentId,
      success: outcome.success,
      errorCode: outcome.errorCode,
    }));

  let finalizeBody: {
    succeeded?: { documentId: string; fileName: string; mimeType: string }[];
    failed?: {
      clientFileId: string;
      documentId: string;
      errorCode: string;
      message: string;
    }[];
    message?: string;
  } = { succeeded: [], failed: [] };

  if (finalizePayload.length > 0) {
    const finalizeResponse = await fetch(
      `/api/crm/projects/${encodeURIComponent(input.uploadScope.projectSlug)}/direct-uploads/finalize-batch`,
      {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          uploads: finalizePayload,
        }),
      }
    );

    finalizeBody = (await finalizeResponse.json()) as typeof finalizeBody;

    if (!finalizeResponse.ok) {
      throw new Error(finalizeBody.message ?? 'Could not finalize upload.');
    }
  }

  clearApiCrmDetailCache();

  const succeededIds = new Set(
    (finalizeBody.succeeded ?? []).map((entry) => entry.documentId)
  );
  const failedByClientId = new Map(
    (finalizeBody.failed ?? []).map((entry) => [entry.clientFileId, entry])
  );

  const succeeded: CrmDirectUploadBatchResult['succeeded'][number][] = [];
  const failed: CrmDirectUploadBatchResult['failed'][number][] = [];

  for (const outcome of storageOutcomes) {
    if (outcome.success && succeededIds.has(outcome.documentId)) {
      succeeded.push({
        clientFileId: outcome.clientFileId,
        documentId: outcome.documentId,
        fileName: outcome.fileName,
        mimeType: outcome.mimeType,
      });
      notify?.({
        clientFileId: outcome.clientFileId,
        fileName: outcome.fileName,
        status: 'complete',
      });
      continue;
    }

    const finalizeFail = failedByClientId.get(outcome.clientFileId);
    const message =
      finalizeFail?.message ??
      outcome.message ??
      'Could not finalize upload.';
    failed.push({
      clientFileId: outcome.clientFileId,
      fileName: outcome.fileName,
      file: acceptedByClientId.get(outcome.clientFileId),
      documentId: outcome.documentId || undefined,
      message,
    });
    notify?.({
      clientFileId: outcome.clientFileId,
      fileName: outcome.fileName,
      status: 'failed',
      message,
    });
  }

  return { succeeded, failed, skipped };
}

export async function performCrmDirectUpload(
  file: File,
  uploadScope: CrmDirectUploadScope,
  options?: CrmDirectUploadOptions
): Promise<DirectUploadPrepared & { readonly fileName: string }> {
  const result = await performCrmDirectUploads({
    files: [file],
    uploadScope,
    options,
  });

  if (result.skipped[0] != null) {
    throw new Error(result.skipped[0].message);
  }
  if (result.failed[0] != null) {
    throw new Error(result.failed[0].message);
  }
  const succeeded = result.succeeded[0];
  if (succeeded == null) {
    throw new Error('Could not upload file.');
  }

  return {
    documentId: succeeded.documentId,
    uploadUrl: 'batch://uploaded',
    mimeType: succeeded.mimeType,
    fileName: succeeded.fileName,
  };
}

export async function performCustomerPortalDirectUploads(
  token: string,
  files: readonly File[],
  onFileProgress?: (progress: CrmDirectUploadFileProgress) => void
): Promise<CrmDirectUploadBatchResult> {
  const skipped: CrmDirectUploadBatchResult['skipped'][number][] = [];
  const candidates: { clientFileId: string; file: File }[] = [];

  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    const clientFileId = createClientFileId(index);
    if (candidates.length >= BUILDCORE_UPLOAD_MAX_FILES_PER_BATCH) {
      skipped.push({
        clientFileId,
        fileName: file.name,
        message: `You can upload at most ${BUILDCORE_UPLOAD_MAX_FILES_PER_BATCH} files at once.`,
      });
      onFileProgress?.({
        clientFileId,
        fileName: file.name,
        status: 'skipped',
        message: `You can upload at most ${BUILDCORE_UPLOAD_MAX_FILES_PER_BATCH} files at once.`,
      });
      continue;
    }
    const validation = validateBuildCoreUpload({
      fileName: file.name,
      mimeType: file.type || 'application/octet-stream',
      sizeBytes: file.size,
    });
    if (!validation.ok) {
      skipped.push({ clientFileId, fileName: file.name, message: validation.message });
      onFileProgress?.({
        clientFileId,
        fileName: file.name,
        status: 'skipped',
        message: validation.message,
      });
      continue;
    }
    candidates.push({ clientFileId, file });
    onFileProgress?.({ clientFileId, fileName: file.name, status: 'waiting' });
  }

  if (candidates.length === 0) {
    return { succeeded: [], failed: [], skipped };
  }

  const candidatesByClientId = new Map(candidates.map((entry) => [entry.clientFileId, entry.file]));

  const prepareResponse = await fetch(
    `/api/customer-task/${encodeURIComponent(token)}/direct-uploads/prepare`,
    {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        files: candidates.map((entry) => ({
          clientFileId: entry.clientFileId,
          fileName: entry.file.name,
          mimeType: entry.file.type || 'application/octet-stream',
          sizeBytes: entry.file.size,
        })),
      }),
    }
  );
  const prepareBody = (await prepareResponse.json()) as {
    uploads?: {
      clientFileId: string;
      documentId: string;
      uploadUrl: string;
      mimeType?: string;
    }[];
    message?: string;
  };
  if (!prepareResponse.ok) {
    throw new Error(prepareBody.message ?? 'Could not prepare upload.');
  }
  if (!Array.isArray(prepareBody.uploads)) {
    throw new Error('Could not prepare upload.');
  }

  const preparedByClientId = new Map(
    prepareBody.uploads.map((upload) => [upload.clientFileId, upload])
  );

  const storageOutcomes = await mapWithConcurrency(
    candidates,
    STORAGE_UPLOAD_CONCURRENCY,
    async (entry) => {
      const prepared = preparedByClientId.get(entry.clientFileId);
      if (prepared == null) {
        onFileProgress?.({
          clientFileId: entry.clientFileId,
          fileName: entry.file.name,
          status: 'failed',
          message: 'Prepare response missing this file.',
        });
        return {
          clientFileId: entry.clientFileId,
          documentId: '',
          fileName: entry.file.name,
          mimeType: entry.file.type || 'application/octet-stream',
          success: false,
          errorCode: 'prepare_missing',
          message: 'Prepare response missing this file.',
        };
      }
      onFileProgress?.({
        clientFileId: entry.clientFileId,
        fileName: entry.file.name,
        status: 'uploading',
      });
      try {
        await uploadFileToSignedUrl(
          entry.file,
          prepared.uploadUrl,
          prepared.mimeType ?? entry.file.type
        );
        return {
          clientFileId: entry.clientFileId,
          documentId: prepared.documentId,
          fileName: entry.file.name,
          mimeType: (prepared.mimeType ?? entry.file.type) || 'application/octet-stream',
          success: true,
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Direct upload to storage failed.';
        onFileProgress?.({
          clientFileId: entry.clientFileId,
          fileName: entry.file.name,
          status: 'failed',
          message,
        });
        return {
          clientFileId: entry.clientFileId,
          documentId: prepared.documentId,
          fileName: entry.file.name,
          mimeType: (prepared.mimeType ?? entry.file.type) || 'application/octet-stream',
          success: false,
          errorCode: 'storage_upload_failed',
          message,
        };
      }
    }
  );

  const finalizePayload = storageOutcomes
    .filter((outcome) => outcome.documentId)
    .map((outcome) => ({
      clientFileId: outcome.clientFileId,
      documentId: outcome.documentId,
      success: outcome.success,
      errorCode: outcome.errorCode,
    }));

  let finalizeBody: {
    succeeded?: { clientFileId: string; fileName: string }[];
    failed?: {
      clientFileId: string;
      documentId: string;
      errorCode: string;
      message: string;
    }[];
    message?: string;
  } = { succeeded: [], failed: [] };

  if (finalizePayload.length > 0) {
    const finalizeResponse = await fetch(
      `/api/customer-task/${encodeURIComponent(token)}/direct-uploads/finalize-batch`,
      {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uploads: finalizePayload,
        }),
      }
    );
    finalizeBody = (await finalizeResponse.json()) as typeof finalizeBody;
    if (!finalizeResponse.ok) {
      throw new Error(finalizeBody.message ?? 'Could not finalize upload.');
    }
  }

  const succeededIds = new Set((finalizeBody.succeeded ?? []).map((entry) => entry.clientFileId));
  const failedByClientId = new Map(
    (finalizeBody.failed ?? []).map((entry) => [entry.clientFileId, entry])
  );

  const succeeded: CrmDirectUploadBatchResult['succeeded'][number][] = [];
  const failed: CrmDirectUploadBatchResult['failed'][number][] = [];

  for (const outcome of storageOutcomes) {
    if (outcome.success && succeededIds.has(outcome.clientFileId)) {
      succeeded.push({
        clientFileId: outcome.clientFileId,
        documentId: outcome.documentId,
        fileName: outcome.fileName,
        mimeType: outcome.mimeType,
      });
      onFileProgress?.({
        clientFileId: outcome.clientFileId,
        fileName: outcome.fileName,
        status: 'complete',
      });
      continue;
    }
    const message =
      failedByClientId.get(outcome.clientFileId)?.message ??
      outcome.message ??
      'Could not finalize upload.';
    failed.push({
      clientFileId: outcome.clientFileId,
      fileName: outcome.fileName,
      file: candidatesByClientId.get(outcome.clientFileId),
      documentId: outcome.documentId || undefined,
      message,
    });
    onFileProgress?.({
      clientFileId: outcome.clientFileId,
      fileName: outcome.fileName,
      status: 'failed',
      message,
    });
  }

  return { succeeded, failed, skipped };
}

export async function performCustomerPortalDirectUpload(
  token: string,
  file: File
): Promise<{ readonly documentId: string; readonly fileName: string }> {
  const result = await performCustomerPortalDirectUploads(token, [file]);
  if (result.skipped[0] != null) throw new Error(result.skipped[0].message);
  if (result.failed[0] != null) throw new Error(result.failed[0].message);
  const succeeded = result.succeeded[0];
  if (succeeded == null) throw new Error('Could not upload file.');
  return { documentId: succeeded.documentId, fileName: succeeded.fileName };
}
