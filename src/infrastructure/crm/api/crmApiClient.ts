import { getSession } from '@/infrastructure/supabase/supabaseClient';
import { isDemoRuntimeClient } from '@/infrastructure/runtime/buildCoreRuntime';
import {
  getCrmDataSource,
  type CrmDataSource,
} from '@/infrastructure/config/crmDataSource';

export class CrmApiError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
    message?: string,
    readonly details: Readonly<Record<string, unknown>> = {}
  ) {
    super(message ?? code);
    this.name = 'CrmApiError';
  }
}

/**
 * Final safety boundary: demo data must never cross into authenticated CRM BFF
 * routes, even if a future component accidentally bypasses the repository gate.
 */
export function assertCrmApiAvailableForRuntime(
  demoRuntime: boolean = isDemoRuntimeClient(),
  source: CrmDataSource = getCrmDataSource()
): void {
  if (demoRuntime) {
    throw new CrmApiError(
      'demo_runtime_blocked',
      403,
      'Production CRM APIs are unavailable in the interactive demo.'
    );
  }
  if (source !== 'api') {
    throw new CrmApiError(
      'crm_api_source_blocked',
      403,
      'Production CRM APIs are unavailable while the mock CRM data source is active.'
    );
  }
}

async function getAccessToken(): Promise<string> {
  assertCrmApiAvailableForRuntime();
  const session = await getSession();
  const token = session?.access_token;
  if (!token) {
    throw new CrmApiError('unauthenticated', 401);
  }
  return token;
}

/**
 * The only client-side transport for authenticated BuildCore CRM BFF routes.
 * Raw responses are exposed for downloads and other non-JSON payloads while
 * preserving the same demo-runtime guard and authorization boundary.
 */
export async function crmApiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  if (path !== '/api/crm' && !path.startsWith('/api/crm/')) {
    throw new Error(`crmApiFetch only accepts /api/crm routes: ${path}`);
  }
  const token = await getAccessToken();
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${token}`);
  return fetch(path, {
    ...init,
    headers,
    cache: init.cache ?? 'no-store',
  });
}

export async function crmApiPostJson<T>(
  path: string,
  payload: unknown,
  init?: { readonly signal?: AbortSignal }
): Promise<T> {
  const response = await crmApiFetch(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    cache: 'no-store',
    signal: init?.signal,
  });

  return parseCrmApiResponse<T>(response);
}

async function parseCrmApiResponse<T>(response: Response): Promise<T> {
  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    const record = body != null && typeof body === 'object' ? (body as Record<string, unknown>) : {};
    const code = typeof record.error === 'string' ? record.error : 'request_failed';
    const message = typeof record.message === 'string' ? record.message : response.statusText;
    const { error: _error, message: _message, ...details } = record;
    throw new CrmApiError(code, response.status, message, details);
  }

  return body as T;
}

export async function crmApiPatchJson<T>(path: string, payload: unknown): Promise<T> {
  const response = await crmApiFetch(path, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    cache: 'no-store',
  });
  return parseCrmApiResponse<T>(response);
}

export async function crmApiDeleteJson<T>(path: string, payload?: unknown): Promise<T> {
  const response = await crmApiFetch(path, {
    method: 'DELETE',
    headers: payload === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: payload === undefined ? undefined : JSON.stringify(payload),
    cache: 'no-store',
  });
  return parseCrmApiResponse<T>(response);
}

export async function crmApiPostFormData<T>(path: string, formData: FormData): Promise<T> {
  const response = await crmApiFetch(path, {
    method: 'POST',
    body: formData,
    cache: 'no-store',
  });
  return parseCrmApiResponse<T>(response);
}

export async function crmApiGetJson<T>(
  path: string,
  init?: { readonly signal?: AbortSignal }
): Promise<T> {
  const response = await crmApiFetch(path, {
    method: 'GET',
    cache: 'no-store',
    signal: init?.signal,
  });
  return parseCrmApiResponse<T>(response);
}

export async function crmApiGetText(path: string): Promise<string> {
  const response = await crmApiFetch(path, {
    method: 'GET',
    cache: 'no-store',
  });

  if (!response.ok) {
    let body: unknown = null;
    try {
      body = await response.json();
    } catch {
      body = null;
    }
    const record = body != null && typeof body === 'object' ? (body as Record<string, unknown>) : {};
    const code = typeof record.error === 'string' ? record.error : 'request_failed';
    const message = typeof record.message === 'string' ? record.message : response.statusText;
    throw new CrmApiError(code, response.status, message);
  }

  return response.text();
}
