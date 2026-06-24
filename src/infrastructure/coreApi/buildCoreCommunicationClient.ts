/**
 * BuildCore → ZenformedCore communications relay client.
 */

import { env } from '@/infrastructure/config/env';
import type { CoreApiError, CoreApiResult } from '@/infrastructure/coreApi/types';

const BUILDCORE_APP_SLUG = 'buildcore';
const DEFAULT_TIMEOUT_MS = 30_000;

export type CommunicationSendAttachmentInput = {
  readonly crmDocumentId: string;
};

export type CommunicationSendRequestBody = {
  readonly templateKey: string;
  readonly channel: 'email';
  readonly recipient: {
    readonly email: string;
    readonly name?: string | null;
    readonly contactId?: string | null;
    readonly memberId?: string | null;
  };
  readonly entity?: {
    readonly type: 'workflow_task' | 'payment' | 'budget_entry' | 'project' | 'subproject';
    readonly id: string;
  } | null;
  readonly subject: string;
  readonly message?: string | null;
  readonly attachments?: readonly CommunicationSendAttachmentInput[];
  readonly context?: {
    readonly projectName?: string | null;
    readonly entityLabel?: string | null;
  } | null;
};

export type CommunicationSendResponse = {
  readonly ok: true;
  readonly communicationRequestId: string;
  readonly deliveryStatus: 'sent';
  readonly providerMessageId: string | null;
  readonly error: null;
};

function normalizeBaseUrl(raw: string): string {
  return raw.replace(/\/+$/, '');
}

function coreUrl(path: string): string | null {
  const base = env.zenformedCoreApiBaseUrl;
  if (base == null) return null;
  return `${normalizeBaseUrl(base)}${path.startsWith('/') ? path : `/${path}`}`;
}

function parseCommunicationSendJson(body: unknown): CommunicationSendResponse | null {
  if (body == null || typeof body !== 'object') return null;
  const o = body as Record<string, unknown>;
  if (o.ok !== true) return null;
  if (typeof o.communicationRequestId !== 'string' || o.communicationRequestId.trim() === '') {
    return null;
  }
  if (o.deliveryStatus !== 'sent') return null;
  return {
    ok: true,
    communicationRequestId: o.communicationRequestId,
    deliveryStatus: 'sent',
    providerMessageId: typeof o.providerMessageId === 'string' ? o.providerMessageId : null,
    error: null,
  };
}

export function communicationSendErrorMessage(error: CoreApiError): string {
  if (error.kind === 'unconfigured') {
    return 'Email communications require ZenformedCore configuration.';
  }
  if (error.kind === 'timeout') {
    return 'The communication request timed out. Try again.';
  }
  if (error.kind === 'network') {
    return error.message?.trim() || 'Could not reach ZenformedCore.';
  }
  if (error.kind === 'http_error') {
    const body =
      error.body != null && typeof error.body === 'object'
        ? (error.body as Record<string, unknown>)
        : null;
    const message = typeof body?.message === 'string' ? body.message.trim() : '';
    if (message) return message;
    const nestedError = typeof body?.error === 'string' ? body.error.trim() : '';
    if (nestedError === 'invalid_request') {
      return 'The communication request was invalid.';
    }
    return 'Could not send the communication email. Try again.';
  }
  return 'Could not send the communication email. Try again.';
}

/** `POST /apps/buildcore/orgs/:organizationId/communications/send` on ZenformedCore */
export async function postBuildCoreCommunicationSend(
  accessToken: string,
  organizationId: string,
  body: CommunicationSendRequestBody
): Promise<CoreApiResult<CommunicationSendResponse>> {
  const encodedOrgId = encodeURIComponent(organizationId);
  const path = `/apps/${BUILDCORE_APP_SLUG}/orgs/${encodedOrgId}/communications/send`;
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
      body: JSON.stringify(body),
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
    const parsed = parseCommunicationSendJson(json);
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
