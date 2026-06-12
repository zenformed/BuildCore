/**
 * ZenformedCore BuildCore CRM notification relay.
 */

import { env } from '@/infrastructure/config/env';
import type { CoreApiError, CoreApiResult } from '@/infrastructure/coreApi/types';

const DEFAULT_TIMEOUT_MS = 15_000;

export type BuildCoreWorkflowTaskNotifyCustomerResponse = {
  readonly ok: true;
  readonly emailDeliveryStatus: 'sent';
};

function normalizeBaseUrl(raw: string): string {
  return raw.replace(/\/+$/, '');
}

function coreUrl(path: string): string | null {
  const base = env.zenformedCoreApiBaseUrl;
  if (base == null) return null;
  return `${normalizeBaseUrl(base)}${path.startsWith('/') ? path : `/${path}`}`;
}

function parseNotifyCustomerJson(body: unknown): BuildCoreWorkflowTaskNotifyCustomerResponse | null {
  if (body == null || typeof body !== 'object') return null;
  const o = body as Record<string, unknown>;
  if (o.ok !== true) return null;
  if (o.emailDeliveryStatus !== 'sent') return null;
  return { ok: true, emailDeliveryStatus: 'sent' };
}

/** `POST /apps/buildcore/crm/workflow-tasks/:taskId/notify-assigned` on ZenformedCore */
export async function postBuildCoreWorkflowTaskNotifyAssigned(
  accessToken: string,
  taskId: string,
  body?: { readonly appBaseUrl?: string }
): Promise<CoreApiResult<BuildCoreWorkflowTaskNotifyCustomerResponse>> {
  const encoded = encodeURIComponent(taskId);
  const path = `/apps/buildcore/crm/workflow-tasks/${encoded}/notify-assigned`;
  const url = coreUrl(path);
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
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body ?? {}),
    });
    let json: unknown;
    try {
      json = await res.json();
    } catch {
      return { ok: false, error: { kind: 'invalid_payload' } };
    }
    if (!res.ok) {
      return { ok: false, error: { kind: 'http_error', status: res.status, body: json } };
    }
    const parsed = parseNotifyCustomerJson(json);
    if (parsed == null) {
      return { ok: false, error: { kind: 'invalid_payload' } };
    }
    return { ok: true, data: parsed };
  } catch (e) {
    const aborted = e instanceof Error && e.name === 'AbortError';
    if (aborted) return { ok: false, error: { kind: 'timeout' } };
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: { kind: 'network', message } };
  } finally {
    clearTimeout(timer);
  }
}

/** `POST /apps/buildcore/crm/workflow-tasks/:taskId/notify-customer` on ZenformedCore */
export async function postBuildCoreWorkflowTaskNotifyCustomer(
  accessToken: string,
  taskId: string,
  body?: { readonly portalBaseUrl?: string }
): Promise<CoreApiResult<BuildCoreWorkflowTaskNotifyCustomerResponse>> {
  const encoded = encodeURIComponent(taskId);
  const path = `/apps/buildcore/crm/workflow-tasks/${encoded}/notify-customer`;
  const url = coreUrl(path);
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
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body ?? {}),
    });
    let json: unknown;
    try {
      json = await res.json();
    } catch {
      return { ok: false, error: { kind: 'invalid_payload' } };
    }
    if (!res.ok) {
      return { ok: false, error: { kind: 'http_error', status: res.status, body: json } };
    }
    const parsed = parseNotifyCustomerJson(json);
    if (parsed == null) {
      return { ok: false, error: { kind: 'invalid_payload' } };
    }
    return { ok: true, data: parsed };
  } catch (e) {
    const aborted = e instanceof Error && e.name === 'AbortError';
    if (aborted) return { ok: false, error: { kind: 'timeout' } };
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: { kind: 'network', message } };
  } finally {
    clearTimeout(timer);
  }
}

export function notifyCustomerErrorMessage(
  error: Extract<CoreApiResult<unknown>, { ok: false }>['error']
): string {
  if (error.kind === 'http_error' && error.body != null && typeof error.body === 'object') {
    const message = (error.body as Record<string, unknown>).message;
    if (typeof message === 'string' && message.trim()) return message.trim();
  }
  if (error.kind === 'network' && error.message) return error.message;
  if (error.kind === 'unconfigured') {
    return 'Email notifications require ZenformedCore to be configured.';
  }
  return 'Could not send the notification email. Try again.';
}

/** @deprecated Use notifyAssignedErrorMessage */
export const notifyAssignedErrorMessage = notifyCustomerErrorMessage;
