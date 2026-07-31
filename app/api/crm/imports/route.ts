/**
 * POST /api/crm/imports — create spreadsheet import draft job.
 */

import { NextRequest, NextResponse } from 'next/server';
import { SPREADSHEET_IMPORT_MAX_REQUEST_BYTES } from '@/domain/crm/spreadsheetImportLimits';
import type {
  CrmImportColumnMapping,
  CrmImportMode,
  CrmImportParsedRow,
} from '@/domain/crm/spreadsheetImportTypes';
import type { ImportDuplicateCheckSnapshot } from '@/domain/crm/importDuplicateDecisions';
import { requireCrmApiAuth } from '@/infrastructure/crm/server/crmApiRouteAuth';
import { mapCrmRouteError } from '@/infrastructure/crm/server/crmApiRouteErrors';
import { requireBuildCoreProjectManagementAccess } from '@/infrastructure/crm/server/buildCoreProjectManagementAccess';
import { createSpreadsheetImportDraft } from '@/infrastructure/crm/server/crmSpreadsheetImportService';

export const dynamic = 'force-dynamic';

type CreateImportDraftBody = {
  readonly importMode?: CrmImportMode;
  readonly fixedParentProjectId?: string | null;
  readonly fixedParentDisplayName?: string | null;
  readonly sourceFilename?: string;
  readonly sheetName?: string;
  readonly headerRowIndex?: number;
  readonly idempotencyKey?: string;
  readonly columns?: readonly CrmImportColumnMapping[];
  readonly mappings?: readonly CrmImportColumnMapping[];
  readonly rows?: readonly CrmImportParsedRow[];
  readonly duplicateCheck?: ImportDuplicateCheckSnapshot | null;
};

function requestBodyTooLarge(request: NextRequest): boolean {
  const contentLength = request.headers.get('Content-Length');
  if (contentLength != null) {
    const bytes = Number(contentLength);
    if (Number.isFinite(bytes) && bytes > SPREADSHEET_IMPORT_MAX_REQUEST_BYTES) {
      return true;
    }
  }
  return false;
}

function parseCreateImportDraftBody(body: CreateImportDraftBody): {
  readonly ok: true;
  readonly input: Parameters<typeof createSpreadsheetImportDraft>[3];
} | {
  readonly ok: false;
  readonly message: string;
} {
  const importMode = body.importMode;
  if (importMode !== 'into_existing_parent' && importMode !== 'master_hierarchy') {
    return { ok: false, message: 'importMode is required.' };
  }

  const sourceFilename = typeof body.sourceFilename === 'string' ? body.sourceFilename.trim() : '';
  if (!sourceFilename) {
    return { ok: false, message: 'sourceFilename is required.' };
  }

  const sheetName = typeof body.sheetName === 'string' ? body.sheetName.trim() : '';
  if (!sheetName) {
    return { ok: false, message: 'sheetName is required.' };
  }

  const headerRowIndex = body.headerRowIndex;
  if (typeof headerRowIndex !== 'number' || !Number.isInteger(headerRowIndex) || headerRowIndex < 0) {
    return { ok: false, message: 'headerRowIndex must be a non-negative integer.' };
  }

  const idempotencyKey = typeof body.idempotencyKey === 'string' ? body.idempotencyKey.trim() : '';
  if (!idempotencyKey) {
    return { ok: false, message: 'idempotencyKey is required.' };
  }

  const mappings = body.mappings ?? body.columns;
  if (!Array.isArray(mappings) || mappings.length === 0) {
    return { ok: false, message: 'At least one column mapping is required.' };
  }

  const rows = body.rows;
  if (!Array.isArray(rows) || rows.length === 0) {
    return { ok: false, message: 'At least one row is required.' };
  }

  return {
    ok: true,
    input: {
      importMode,
      fixedParentProjectId: body.fixedParentProjectId ?? null,
      fixedParentDisplayName: body.fixedParentDisplayName ?? null,
      sourceFilename,
      sheetName,
      headerRowIndex,
      idempotencyKey,
      mappings,
      rows,
      duplicateCheck: body.duplicateCheck ?? null,
    },
  };
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await requireCrmApiAuth(request.headers.get('Authorization'));
  if (!auth.ok) return auth.response;

  const access = await requireBuildCoreProjectManagementAccess(
    auth.context.supabase,
    auth.context.organizationId,
    auth.context.user.id,
    'create'
  );
  if (!access.ok) return access.response;

  if (requestBodyTooLarge(request)) {
    return NextResponse.json(
      {
        error: 'payload_too_large',
        message: `Request body exceeds ${SPREADSHEET_IMPORT_MAX_REQUEST_BYTES} bytes.`,
      },
      { status: 413 }
    );
  }

  let rawBody: CreateImportDraftBody;
  try {
    const text = await request.text();
    if (text.length > SPREADSHEET_IMPORT_MAX_REQUEST_BYTES) {
      return NextResponse.json(
        {
          error: 'payload_too_large',
          message: `Request body exceeds ${SPREADSHEET_IMPORT_MAX_REQUEST_BYTES} bytes.`,
        },
        { status: 413 }
      );
    }
    rawBody = JSON.parse(text) as CreateImportDraftBody;
  } catch {
    return NextResponse.json({ error: 'invalid_body', message: 'JSON body required' }, { status: 400 });
  }

  const parsed = parseCreateImportDraftBody(rawBody);
  if (!parsed.ok) {
    return NextResponse.json({ error: 'validation_error', message: parsed.message }, { status: 400 });
  }

  try {
    const result = await createSpreadsheetImportDraft(
      auth.context.supabase,
      auth.context.organizationId,
      auth.context.user.id,
      parsed.input
    );
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    return mapCrmRouteError(err, 'Failed to create spreadsheet import draft');
  }
}
