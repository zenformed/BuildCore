/**
 * Shared client + server limits for spreadsheet import (Phase 1).
 * Import this module from UI and API — do not duplicate magic numbers.
 */

export const SPREADSHEET_IMPORT_MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB
export const SPREADSHEET_IMPORT_MAX_ROWS = 5_000;
export const SPREADSHEET_IMPORT_MAX_COLUMNS = 100;
export const SPREADSHEET_IMPORT_MAX_PARENT_GROUPS = 500;
export const SPREADSHEET_IMPORT_MAX_CELL_CHARS = 10_000;
/** Spreadsheet headers may be longer than CF labels (80); truncate for keys. */
export const SPREADSHEET_IMPORT_MAX_HEADER_CHARS = 120;
export const SPREADSHEET_IMPORT_MAX_NEW_CUSTOM_FIELDS = 25;
export const SPREADSHEET_IMPORT_CHUNK_MAX_ENTITIES = 25;
export const SPREADSHEET_IMPORT_CLAIM_TTL_MS = 90_000;
export const SPREADSHEET_IMPORT_POLL_INTERVAL_MS = 750;
/** Max JSON body for draft create (~aligned with file size spirit). */
export const SPREADSHEET_IMPORT_MAX_REQUEST_BYTES = 8 * 1024 * 1024;

export const SPREADSHEET_IMPORT_LIMITS = {
  maxFileBytes: SPREADSHEET_IMPORT_MAX_FILE_BYTES,
  maxRows: SPREADSHEET_IMPORT_MAX_ROWS,
  maxColumns: SPREADSHEET_IMPORT_MAX_COLUMNS,
  maxParentGroups: SPREADSHEET_IMPORT_MAX_PARENT_GROUPS,
  maxCellChars: SPREADSHEET_IMPORT_MAX_CELL_CHARS,
  maxHeaderChars: SPREADSHEET_IMPORT_MAX_HEADER_CHARS,
  maxNewCustomFields: SPREADSHEET_IMPORT_MAX_NEW_CUSTOM_FIELDS,
  chunkMaxEntities: SPREADSHEET_IMPORT_CHUNK_MAX_ENTITIES,
  claimTtlMs: SPREADSHEET_IMPORT_CLAIM_TTL_MS,
  pollIntervalMs: SPREADSHEET_IMPORT_POLL_INTERVAL_MS,
  maxRequestBytes: SPREADSHEET_IMPORT_MAX_REQUEST_BYTES,
} as const;
