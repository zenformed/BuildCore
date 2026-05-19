import { getSession } from '@/infrastructure/supabase/supabaseClient';

export class CrmApiError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
    message?: string
  ) {
    super(message ?? code);
    this.name = 'CrmApiError';
  }
}

async function getAccessToken(): Promise<string> {
  const session = await getSession();
  const token = session?.access_token;
  if (!token) {
    throw new CrmApiError('unauthenticated', 401);
  }
  return token;
}

export async function crmApiPostJson<T>(path: string, payload: unknown): Promise<T> {
  const token = await getAccessToken();
  const response = await fetch(path, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    cache: 'no-store',
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
    throw new CrmApiError(code, response.status, message);
  }

  return body as T;
}

export async function crmApiPatchJson<T>(path: string, payload: unknown): Promise<T> {
  const token = await getAccessToken();
  const response = await fetch(path, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    cache: 'no-store',
  });
  return parseCrmApiResponse<T>(response);
}

export async function crmApiDeleteJson<T>(path: string): Promise<T> {
  const token = await getAccessToken();
  const response = await fetch(path, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  return parseCrmApiResponse<T>(response);
}

export async function crmApiPostFormData<T>(path: string, formData: FormData): Promise<T> {
  const token = await getAccessToken();
  const response = await fetch(path, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
    cache: 'no-store',
  });
  return parseCrmApiResponse<T>(response);
}

export async function crmApiGetJson<T>(path: string): Promise<T> {
  const token = await getAccessToken();
  const response = await fetch(path, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  return parseCrmApiResponse<T>(response);
}
