import { CrmApiError } from '@/infrastructure/crm/api/crmApiClient';
import { getSession } from '@/infrastructure/supabase/supabaseClient';
import { downloadBlob } from '@/reports/export/downloadBlob';

function parseContentDispositionFileName(header: string | null): string | null {
  if (header == null || header.trim() === '') return null;

  const utf8Match = /filename\*=UTF-8''([^;]+)/i.exec(header);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1].trim());
    } catch {
      return utf8Match[1].trim();
    }
  }

  const asciiMatch = /filename="([^"]+)"/i.exec(header) ?? /filename=([^;]+)/i.exec(header);
  if (asciiMatch?.[1]) {
    return asciiMatch[1].trim();
  }

  return null;
}

export async function downloadCrmDocumentAttachment(
  apiPath: string,
  fallbackFileName = 'download'
): Promise<void> {
  const session = await getSession();
  const token = session?.access_token;
  if (token == null || token.trim() === '') {
    throw new CrmApiError('unauthenticated', 401);
  }

  const response = await fetch(apiPath, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
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

  const fileName =
    parseContentDispositionFileName(response.headers.get('Content-Disposition')) ?? fallbackFileName;
  const blob = await response.blob();
  downloadBlob(blob, fileName);
}

export async function downloadCrmDocumentFromSignedUrl(
  signedUrl: string,
  fileName: string
): Promise<void> {
  const response = await fetch(signedUrl, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error('Could not download file.');
  }
  const blob = await response.blob();
  downloadBlob(blob, fileName);
}
