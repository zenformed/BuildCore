/**
 * ZenformedCore BuildCore direct upload relay (no file bodies through BuildCore server).
 */

import { buildcoreAppDefinition } from '@/platform/appDefinitions/buildcore';
import { env } from '@/infrastructure/config/env';
import type { CoreApiError, CoreApiResult } from '@/infrastructure/coreApi/types';

const APP_SLUG = buildcoreAppDefinition.appSlug;
const DEFAULT_TIMEOUT_MS = 30_000;

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

export type FinalizeDirectUploadDocument = {
  readonly documentId: string;
  readonly fileName: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
  readonly workflowTaskId: string | null;
  readonly budgetEntryId: string | null;
  readonly documentType: string;
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

export async function prepareBuildCoreDirectUploadOnCore(
  accessToken: string,
  organizationId: string,
  payload: PrepareDirectUploadPayload
): Promise<CoreApiResult<PrepareDirectUploadResult>> {
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
    const json = (await res.json()) as PrepareDirectUploadResult;
    if (!res.ok) return { ok: false, error: mapHttpError(res, json) };
    if (typeof json.documentId !== 'string' || typeof json.uploadUrl !== 'string') {
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

export async function prepareCustomerPortalDirectUploadOnCore(
  token: string,
  payload: { fileName: string; mimeType: string; sizeBytes: number }
): Promise<CoreApiResult<PrepareDirectUploadResult>> {
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
      body: JSON.stringify(payload),
    });
    const json = (await res.json()) as PrepareDirectUploadResult;
    if (!res.ok) return { ok: false, error: mapHttpError(res, json) };
    if (typeof json.documentId !== 'string' || typeof json.uploadUrl !== 'string') {
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
