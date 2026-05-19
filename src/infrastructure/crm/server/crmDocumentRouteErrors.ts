import { NextResponse } from 'next/server';
import { CrmDocumentServiceError } from '@/infrastructure/crm/errors';

export function crmDocumentErrorResponse(err: unknown): NextResponse {
  if (err instanceof CrmDocumentServiceError) {
    const status =
      err.code === 'not_found'
        ? 404
        : err.code === 'STORAGE_LIMIT_EXCEEDED' ||
            err.code === 'INVALID_FILE_TYPE' ||
            err.code === 'FILE_TOO_LARGE' ||
            err.code === 'EMPTY_FILE' ||
            err.code === 'DOCUMENTS_REQUIRED'
          ? 400
          : 400;
    return NextResponse.json({ error: err.code, message: err.message }, { status });
  }
  if (err instanceof Error) {
    if (
      err.message === 'zenformed_core_unconfigured' ||
      err.message === 'zenformed_core_storage_unavailable'
    ) {
      return NextResponse.json(
        {
          error: 'misconfigured',
          message:
            'Document storage requires ZENFORMED_CORE_API_URL and ZenformedCore service role configuration.',
        },
        { status: 503 }
      );
    }
  }
  const message = err instanceof Error ? err.message : 'Request failed';
  return NextResponse.json({ error: 'internal_error', message }, { status: 500 });
}
