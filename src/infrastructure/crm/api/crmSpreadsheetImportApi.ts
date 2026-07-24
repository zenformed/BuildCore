import type {
  CrmImportColumnMapping,
  CrmImportIssue,
  CrmImportJobCounts,
  CrmImportJobStatus,
  CrmImportMode,
  CrmImportParentResolution,
  CrmImportParsedRow,
} from '@/domain/crm/spreadsheetImportTypes';
import {
  crmApiGetJson,
  crmApiGetText,
  crmApiPostJson,
} from '@/infrastructure/crm/api/crmApiClient';
import type {
  CrmImportSuggestedParent,
  CrmImportValidateGroup,
} from '@/infrastructure/crm/server/crmSpreadsheetImportService';

const IMPORTS_API_BASE = '/api/crm/imports';

export type CreateSpreadsheetImportDraftRequest = {
  readonly importMode: CrmImportMode;
  readonly fixedParentProjectId?: string | null;
  readonly fixedParentDisplayName?: string | null;
  readonly sourceFilename: string;
  readonly sheetName: string;
  readonly headerRowIndex: number;
  readonly idempotencyKey: string;
  readonly columns?: readonly CrmImportColumnMapping[];
  readonly mappings?: readonly CrmImportColumnMapping[];
  readonly rows: readonly CrmImportParsedRow[];
};

export type CreateSpreadsheetImportDraftResponse = {
  readonly jobId: string;
  readonly status: 'draft' | 'ready';
};

export type SpreadsheetImportJobStatusResponse = {
  readonly job: Record<string, unknown>;
  readonly groups: readonly Record<string, unknown>[];
  readonly counts: CrmImportJobCounts;
  readonly recentRowErrors: readonly Record<string, unknown>[];
};

export type ValidateSpreadsheetImportResponse = {
  readonly groups: readonly CrmImportValidateGroup[];
  readonly rowIssues: readonly CrmImportIssue[];
  readonly mappingErrors: readonly string[];
};

export type SaveSpreadsheetImportResolutionsRequest = {
  readonly groups?: readonly {
    readonly groupKey: string;
    readonly resolution: CrmImportParentResolution;
  }[];
  readonly excludedSourceRowIndexes?: readonly number[];
};

export type SaveSpreadsheetImportResolutionsResponse = {
  readonly status: 'draft' | 'ready';
  readonly blockingGroupKeys: readonly string[];
};

export type StartSpreadsheetImportExecutionRequest = {
  readonly clientClaimToken: string;
};

export type StartSpreadsheetImportExecutionResponse = {
  readonly status: 'running';
  readonly claimExpiresAt: string;
};

export type ProcessSpreadsheetImportChunkRequest = {
  readonly clientClaimToken: string;
};

export type ProcessSpreadsheetImportChunkResponse = {
  readonly done: boolean;
  readonly status: CrmImportJobStatus | string;
  readonly processedEntities: number;
  readonly counts: CrmImportJobCounts;
};

export type CancelSpreadsheetImportResponse = {
  readonly status: 'cancelled';
};

export async function createSpreadsheetImportDraftFromApi(
  payload: CreateSpreadsheetImportDraftRequest
): Promise<CreateSpreadsheetImportDraftResponse> {
  return crmApiPostJson<CreateSpreadsheetImportDraftResponse>(IMPORTS_API_BASE, payload);
}

export async function getSpreadsheetImportJobStatusFromApi(
  jobId: string
): Promise<SpreadsheetImportJobStatusResponse> {
  return crmApiGetJson<SpreadsheetImportJobStatusResponse>(`${IMPORTS_API_BASE}/${jobId}`);
}

export async function validateSpreadsheetImportJobFromApi(
  jobId: string
): Promise<ValidateSpreadsheetImportResponse> {
  return crmApiPostJson<ValidateSpreadsheetImportResponse>(
    `${IMPORTS_API_BASE}/${jobId}/validate`,
    {}
  );
}

export async function saveSpreadsheetImportResolutionsFromApi(
  jobId: string,
  payload: SaveSpreadsheetImportResolutionsRequest
): Promise<SaveSpreadsheetImportResolutionsResponse> {
  return crmApiPostJson<SaveSpreadsheetImportResolutionsResponse>(
    `${IMPORTS_API_BASE}/${jobId}/resolutions`,
    payload
  );
}

export async function startSpreadsheetImportExecutionFromApi(
  jobId: string,
  payload: StartSpreadsheetImportExecutionRequest
): Promise<StartSpreadsheetImportExecutionResponse> {
  return crmApiPostJson<StartSpreadsheetImportExecutionResponse>(
    `${IMPORTS_API_BASE}/${jobId}/execute`,
    payload
  );
}

export async function processSpreadsheetImportNextChunkFromApi(
  jobId: string,
  payload: ProcessSpreadsheetImportChunkRequest
): Promise<ProcessSpreadsheetImportChunkResponse> {
  return crmApiPostJson<ProcessSpreadsheetImportChunkResponse>(
    `${IMPORTS_API_BASE}/${jobId}/process-next-chunk`,
    payload
  );
}

export async function cancelSpreadsheetImportJobFromApi(
  jobId: string
): Promise<CancelSpreadsheetImportResponse> {
  return crmApiPostJson<CancelSpreadsheetImportResponse>(
    `${IMPORTS_API_BASE}/${jobId}/cancel`,
    {}
  );
}

export async function downloadSpreadsheetImportErrorCsvFromApi(jobId: string): Promise<string> {
  return crmApiGetText(`${IMPORTS_API_BASE}/${jobId}/errors.csv`);
}

export type { CrmImportSuggestedParent, CrmImportValidateGroup };
