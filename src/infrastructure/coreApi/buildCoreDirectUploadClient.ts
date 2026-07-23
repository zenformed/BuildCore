/**
 * ZenformedCore BuildCore direct upload relay (no file bodies through BuildCore server).
 */

import { buildcoreAppDefinition } from '@/platform/appDefinitions/buildcore';
import { env } from '@/infrastructure/config/env';
import type { CoreApiError, CoreApiResult } from '@/infrastructure/coreApi/types';

const APP_SLUG = buildcoreAppDefinition.appSlug;
const DEFAULT_TIMEOUT_MS = 60_000;

export type BuildCoreDirectUploadScopePayload =
  | { readonly scope: 'workflow_task'; readonly projectSlug: string; readonly workflowTaskId: string }
  | { readonly scope: 'budget_entry'; readonly projectSlug: string; readonly budgetEntryId: string }
  | { readonly scope: 'project_media'; readonly projectSlug: string };

export type PrepareDirectUploadLocationPayload = {
  readonly latitude: number;
  readonly longitude: number;
  readonly locationAccuracyMeters: number | null;
  readonly locationSource: 'device_capture' | 'exif' | 'manual';
  readonly locationCapturedAt: string;
};

export type PrepareDirectUploadFilePayload = {
  readonly clientFileId: string;
  readonly fileName: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
} & Partial<PrepareDirectUploadLocationPayload>;

export type PrepareDirectUploadBatchPayload = BuildCoreDirectUploadScopePayload & {
  readonly files: readonly PrepareDirectUploadFilePayload[];
};

/** @deprecated Prefer PrepareDirectUploadBatchPayload; kept for single-file legacy shape. */
export type PrepareDirectUploadPayload = BuildCoreDirectUploadScopePayload & {
  readonly fileName: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
} & Partial<PrepareDirectUploadLocationPayload>;

export type PrepareDirectUploadResult = {
  readonly documentId: string;
  readonly uploadUrl: string;
  readonly uploadToken: string;
  readonly storageBucket: string;
  readonly storageKey: string;
  readonly mimeType: string;
};

export type PrepareDirectUploadBatchItem = PrepareDirectUploadResult & {
  readonly clientFileId: string;
};

export type PrepareDirectUploadBatchResult = {
  readonly uploads: readonly PrepareDirectUploadBatchItem[];
};

export type FinalizeDirectUploadDocument = {
  readonly documentId: string;
  readonly fileName: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
  readonly workflowTaskId: string | null;
  readonly budgetEntryId: string | null;
  readonly documentType: string;
};

export type FinalizeDirectUploadBatchItem = {
  readonly clientFileId: string;
  readonly documentId: string;
  readonly success: boolean;
  readonly errorCode?: string;
};

export type FinalizeDirectUploadBatchResult = {
  readonly succeeded: readonly FinalizeDirectUploadDocument[];
  readonly failed: readonly {
    readonly clientFileId: string;
    readonly documentId: string;
    readonly errorCode: string;
    readonly message: string;
  }[];
};

function normalizeBaseUrl(raw: string): string {
  return raw.replace(/\/+$/, '');
}

function coreUrl(path: string): string | null {
  const base = env.zenformedCoreApiBaseUrl;
  if (base == null) return null;
  return `${normalizeBaseUrl(base)}${path.startsWith('/') ? path : `/${path}`}`;
}

function mapHttpError(res: Response, json: unknown): CoreApiError {
  return { kind: 'http_error', status: res.status, body: json };
}

export async function prepareBuildCoreDirectUploadBatchOnCore(
  accessToken: string,
  organizationId: string,
  payload: PrepareDirectUploadBatchPayload
): Promise<CoreApiResult<PrepareDirectUploadBatchResult>> {
  const url = coreUrl(
    `/apps/${encodeURIComponent(APP_SLUG)}/orgs/${encodeURIComponent(organizationId)}/direct-uploads/prepare`
  );
  if (url == null) return { ok: false, error: { kind: 'unconfigured' } };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });
    const json = (await res.json()) as PrepareDirectUploadBatchResult & PrepareDirectUploadResult;
    if (!res.ok) return { ok: false, error: mapHttpError(res, json) };
    if (Array.isArray(json.uploads)) {
      if (json.uploads.some((u) => typeof u.documentId !== 'string' || typeof u.uploadUrl !== 'string')) {
        return { ok: false, error: { kind: 'invalid_payload' } };
      }
      return { ok: true, data: { uploads: json.uploads } };
    }
    // Legacy single-file response when Core unwraps one-file batches without files[].
    if (typeof json.documentId === 'string' && typeof json.uploadUrl === 'string') {
      return {
        ok: true,
        data: {
          uploads: [
            {
              clientFileId: payload.files[0]?.clientFileId ?? 'file-1',
              documentId: json.documentId,
              uploadUrl: json.uploadUrl,
              uploadToken: json.uploadToken,
              storageBucket: json.storageBucket,
              storageKey: json.storageKey,
              mimeType: json.mimeType,
            },
          ],
        },
      };
    }
    return { ok: false, error: { kind: 'invalid_payload' } };
  } catch (e) {
    const aborted = e instanceof Error && e.name === 'AbortError';
    if (aborted) return { ok: false, error: { kind: 'timeout' } };
    return { ok: false, error: { kind: 'network', message: e instanceof Error ? e.message : String(e) } };
  } finally {
    clearTimeout(timer);
  }
}

/** @deprecated Prefer prepareBuildCoreDirectUploadBatchOnCore. */
export async function prepareBuildCoreDirectUploadOnCore(
  accessToken: string,
  organizationId: string,
  payload: PrepareDirectUploadPayload
): Promise<CoreApiResult<PrepareDirectUploadResult>> {
  const batch = await prepareBuildCoreDirectUploadBatchOnCore(accessToken, organizationId, {
    ...payload,
    files: [
      {
        clientFileId: 'file-1',
        fileName: payload.fileName,
        mimeType: payload.mimeType,
        sizeBytes: payload.sizeBytes,
        latitude: payload.latitude,
        longitude: payload.longitude,
        locationAccuracyMeters: payload.locationAccuracyMeters,
        locationSource: payload.locationSource,
        locationCapturedAt: payload.locationCapturedAt,
      },
    ],
  });
  if (!batch.ok) return batch;
  const first = batch.data.uploads[0];
  if (first == null) return { ok: false, error: { kind: 'invalid_payload' } };
  return {
    ok: true,
    data: {
      documentId: first.documentId,
      uploadUrl: first.uploadUrl,
      uploadToken: first.uploadToken,
      storageBucket: first.storageBucket,
      storageKey: first.storageKey,
      mimeType: first.mimeType,
    },
  };
}

export async function finalizeBuildCoreDirectUploadBatchOnCore(
  accessToken: string,
  organizationId: string,
  uploads: readonly FinalizeDirectUploadBatchItem[]
): Promise<CoreApiResult<FinalizeDirectUploadBatchResult>> {
  const url = coreUrl(
    `/apps/${encodeURIComponent(APP_SLUG)}/orgs/${encodeURIComponent(organizationId)}/direct-uploads/finalize-batch`
  );
  if (url == null) return { ok: false, error: { kind: 'unconfigured' } };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ uploads }),
    });
    const json = (await res.json()) as FinalizeDirectUploadBatchResult;
    if (!res.ok) return { ok: false, error: mapHttpError(res, json) };
    if (!Array.isArray(json.succeeded) || !Array.isArray(json.failed)) {
      return { ok: false, error: { kind: 'invalid_payload' } };
    }
    return { ok: true, data: json };
  } catch (e) {
    const aborted = e instanceof Error && e.name === 'AbortError';
    if (aborted) return { ok: false, error: { kind: 'timeout' } };
    return { ok: false, error: { kind: 'network', message: e instanceof Error ? e.message : String(e) } };
  } finally {
    clearTimeout(timer);
  }
}

export async function finalizeBuildCoreDirectUploadOnCore(
  accessToken: string,
  organizationId: string,
  documentId: string
): Promise<CoreApiResult<{ document: FinalizeDirectUploadDocument }>> {
  const url = coreUrl(
    `/apps/${encodeURIComponent(APP_SLUG)}/orgs/${encodeURIComponent(organizationId)}/direct-uploads/${encodeURIComponent(documentId)}/finalize`
  );
  if (url == null) return { ok: false, error: { kind: 'unconfigured' } };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const json = (await res.json()) as { document?: FinalizeDirectUploadDocument };
    if (!res.ok) return { ok: false, error: mapHttpError(res, json) };
    if (json.document == null) return { ok: false, error: { kind: 'invalid_payload' } };
    return { ok: true, data: { document: json.document } };
  } catch (e) {
    const aborted = e instanceof Error && e.name === 'AbortError';
    if (aborted) return { ok: false, error: { kind: 'timeout' } };
    return { ok: false, error: { kind: 'network', message: e instanceof Error ? e.message : String(e) } };
  } finally {
    clearTimeout(timer);
  }
}

export async function prepareCustomerPortalDirectUploadBatchOnCore(
  token: string,
  files: readonly { clientFileId: string; fileName: string; mimeType: string; sizeBytes: number }[]
): Promise<CoreApiResult<PrepareDirectUploadBatchResult>> {
  const url = coreUrl(
    `/apps/${encodeURIComponent(APP_SLUG)}/customer-task/${encodeURIComponent(token)}/direct-uploads/prepare`
  );
  if (url == null) return { ok: false, error: { kind: 'unconfigured' } };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: 'POST',
      signal: controller.signal,
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ files }),
    });
    const json = (await res.json()) as PrepareDirectUploadBatchResult & PrepareDirectUploadResult;
    if (!res.ok) return { ok: false, error: mapHttpError(res, json) };
    if (Array.isArray(json.uploads)) {
      return { ok: true, data: { uploads: json.uploads } };
    }
    if (typeof json.documentId === 'string' && typeof json.uploadUrl === 'string') {
      return {
        ok: true,
        data: {
          uploads: [
            {
              clientFileId: files[0]?.clientFileId ?? 'file-1',
              documentId: json.documentId,
              uploadUrl: json.uploadUrl,
              uploadToken: json.uploadToken,
              storageBucket: json.storageBucket,
              storageKey: json.storageKey,
              mimeType: json.mimeType,
            },
          ],
        },
      };
    }
    return { ok: false, error: { kind: 'invalid_payload' } };
  } catch (e) {
    const aborted = e instanceof Error && e.name === 'AbortError';
    if (aborted) return { ok: false, error: { kind: 'timeout' } };
    return { ok: false, error: { kind: 'network', message: e instanceof Error ? e.message : String(e) } };
  } finally {
    clearTimeout(timer);
  }
}

export async function prepareCustomerPortalDirectUploadOnCore(
  token: string,
  payload: { fileName: string; mimeType: string; sizeBytes: number }
): Promise<CoreApiResult<PrepareDirectUploadResult>> {
  const batch = await prepareCustomerPortalDirectUploadBatchOnCore(token, [
    { clientFileId: 'file-1', ...payload },
  ]);
  if (!batch.ok) return batch;
  const first = batch.data.uploads[0];
  if (first == null) return { ok: false, error: { kind: 'invalid_payload' } };
  return {
    ok: true,
    data: {
      documentId: first.documentId,
      uploadUrl: first.uploadUrl,
      uploadToken: first.uploadToken,
      storageBucket: first.storageBucket,
      storageKey: first.storageKey,
      mimeType: first.mimeType,
    },
  };
}

export async function finalizeCustomerPortalDirectUploadBatchOnCore(
  token: string,
  uploads: readonly FinalizeDirectUploadBatchItem[]
): Promise<
  CoreApiResult<{
    succeeded: readonly { clientFileId: string; fileName: string }[];
    failed: readonly {
      clientFileId: string;
      documentId: string;
      errorCode: string;
      message: string;
    }[];
  }>
> {
  const url = coreUrl(
    `/apps/${encodeURIComponent(APP_SLUG)}/customer-task/${encodeURIComponent(token)}/direct-uploads/finalize-batch`
  );
  if (url == null) return { ok: false, error: { kind: 'unconfigured' } };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: 'POST',
      signal: controller.signal,
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ uploads }),
    });
    const json = (await res.json()) as {
      succeeded?: { clientFileId: string; fileName: string }[];
      failed?: {
        clientFileId: string;
        documentId: string;
        errorCode: string;
        message: string;
      }[];
    };
    if (!res.ok) return { ok: false, error: mapHttpError(res, json) };
    if (!Array.isArray(json.succeeded) || !Array.isArray(json.failed)) {
      return { ok: false, error: { kind: 'invalid_payload' } };
    }
    return { ok: true, data: { succeeded: json.succeeded, failed: json.failed } };
  } catch (e) {
    const aborted = e instanceof Error && e.name === 'AbortError';
    if (aborted) return { ok: false, error: { kind: 'timeout' } };
    return { ok: false, error: { kind: 'network', message: e instanceof Error ? e.message : String(e) } };
  } finally {
    clearTimeout(timer);
  }
}

export async function finalizeCustomerPortalDirectUploadOnCore(
  token: string,
  documentId: string
): Promise<CoreApiResult<{ fileName: string }>> {
  const url = coreUrl(
    `/apps/${encodeURIComponent(APP_SLUG)}/customer-task/${encodeURIComponent(token)}/direct-uploads/${encodeURIComponent(documentId)}/finalize`
  );
  if (url == null) return { ok: false, error: { kind: 'unconfigured' } };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: 'POST',
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    const json = (await res.json()) as { fileName?: string };
    if (!res.ok) return { ok: false, error: mapHttpError(res, json) };
    if (typeof json.fileName !== 'string') return { ok: false, error: { kind: 'invalid_payload' } };
    return { ok: true, data: { fileName: json.fileName } };
  } catch (e) {
    const aborted = e instanceof Error && e.name === 'AbortError';
    if (aborted) return { ok: false, error: { kind: 'timeout' } };
    return { ok: false, error: { kind: 'network', message: e instanceof Error ? e.message : String(e) } };
  } finally {
    clearTimeout(timer);
  }
}

export async function uploadFileToSignedUrl(
  file: File,
  uploadUrl: string,
  mimeType: string
): Promise<void> {
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': mimeType || file.type || 'application/octet-stream' },
    body: file,
  });
  if (!response.ok) {
    throw new Error('Direct upload to storage failed.');
  }
}

/** Run async tasks with a fixed concurrency limit. */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const limit = Math.max(1, Math.floor(concurrency));
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await mapper(items[index], index);
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}
