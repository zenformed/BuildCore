/**
 * ZenformedCore BuildCore customer task portal relay (no service role in BuildCore).
 */

import { buildcoreAppDefinition } from '@/platform/appDefinitions/buildcore';
import { env } from '@/infrastructure/config/env';
import type { CustomerTaskPortalView } from '@/domain/crm/customerTaskRequest';
import type { CoreApiError, CoreApiResult } from '@/infrastructure/coreApi/types';

const APP_SLUG = buildcoreAppDefinition.appSlug;
const DEFAULT_TIMEOUT_MS = 30_000;
const UPLOAD_TIMEOUT_MS = 120_000;

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

export async function getBuildCoreCustomerTaskPortalFromCore(
  token: string
): Promise<CoreApiResult<{ portal: CustomerTaskPortalView }>> {
  const url = coreUrl(`/apps/${encodeURIComponent(APP_SLUG)}/customer-task/${encodeURIComponent(token)}`);
  if (url == null) return { ok: false, error: { kind: 'unconfigured' } };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    const json = (await res.json()) as { portal?: CustomerTaskPortalView };
    if (!res.ok) return { ok: false, error: mapHttpError(res, json) };
    if (json.portal == null) return { ok: false, error: { kind: 'invalid_payload' } };
    return { ok: true, data: { portal: json.portal } };
  } catch (e) {
    const aborted = e instanceof Error && e.name === 'AbortError';
    if (aborted) return { ok: false, error: { kind: 'timeout' } };
    return { ok: false, error: { kind: 'network', message: e instanceof Error ? e.message : String(e) } };
  } finally {
    clearTimeout(timer);
  }
}

export async function uploadBuildCoreCustomerTaskPortalDocumentToCore(
  token: string,
  file: File
): Promise<CoreApiResult<{ fileName: string }>> {
  const url = coreUrl(
    `/apps/${encodeURIComponent(APP_SLUG)}/customer-task/${encodeURIComponent(token)}/documents`
  );
  if (url == null) return { ok: false, error: { kind: 'unconfigured' } };

  const formData = new FormData();
  formData.append('file', file);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: 'POST',
      signal: controller.signal,
      body: formData,
    });
    const json = (await res.json()) as { fileName?: string; message?: string };
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

export async function submitBuildCoreCustomerTaskPortalToCore(
  token: string,
  responseText: string | null
): Promise<CoreApiResult<{ ok: true }>> {
  const url = coreUrl(
    `/apps/${encodeURIComponent(APP_SLUG)}/customer-task/${encodeURIComponent(token)}/submit`
  );
  if (url == null) return { ok: false, error: { kind: 'unconfigured' } };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: 'POST',
      signal: controller.signal,
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ responseText }),
    });
    const json = (await res.json()) as { ok?: boolean; message?: string };
    if (!res.ok) return { ok: false, error: mapHttpError(res, json) };
    return { ok: true, data: { ok: true } };
  } catch (e) {
    const aborted = e instanceof Error && e.name === 'AbortError';
    if (aborted) return { ok: false, error: { kind: 'timeout' } };
    return { ok: false, error: { kind: 'network', message: e instanceof Error ? e.message : String(e) } };
  } finally {
    clearTimeout(timer);
  }
}

export function customerTaskPortalCoreErrorMessage(
  error: Extract<CoreApiResult<unknown>, { ok: false }>['error']
): string {
  if (error.kind === 'http_error' && error.body != null && typeof error.body === 'object') {
    const message = (error.body as Record<string, unknown>).message;
    if (typeof message === 'string' && message.trim()) return message.trim();
  }
  if (error.kind === 'unconfigured') {
    return 'Customer portal requires ZenformedCore to be configured.';
  }
  if (error.kind === 'network' && error.message) return error.message;
  return 'Customer portal request failed. Try again.';
}
