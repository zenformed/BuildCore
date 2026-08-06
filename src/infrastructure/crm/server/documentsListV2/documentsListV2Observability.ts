/**
 * Structured observability for Documents list v2.
 * Never log PII, filenames, search text, storage paths, or cursor payloads.
 */

export type CrmDocumentsListV2CursorFailureCategory =
  | 'malformed'
  | 'bad_signature'
  | 'wrong_org'
  | 'wrong_project'
  | 'wrong_fingerprint'
  | 'wrong_limit'
  | 'wrong_type'
  | 'expired'
  | 'misconfigured_secret';

export type CrmDocumentsListV2LogEvent =
  | {
      readonly name: 'crm.documents_list_v2.query';
      readonly durationMs: number;
      readonly rowsReturned: number;
      readonly requestedLimit: number;
      readonly direction: 'forward' | 'first';
      readonly searchActive: boolean;
      readonly payloadBytesApprox?: number;
    }
  | {
      readonly name: 'crm.documents_list_v2.cursor_invalid';
      readonly category: CrmDocumentsListV2CursorFailureCategory;
    }
  | {
      readonly name:
        | 'crm.documents_list_v2.auth_failure'
        | 'crm.documents_list_v2.db_failure'
        | 'crm.documents_list_v2.cancelled'
        | 'crm.documents_list_v2.empty_page';
      readonly code?: string;
    };

export type CrmDocumentsListV2LogSink = (event: CrmDocumentsListV2LogEvent) => void;

const defaultSink: CrmDocumentsListV2LogSink = (event) => {
  if (process.env.BUILDCORE_DOCUMENTS_LIST_V2_LOGS === 'true') {
    // eslint-disable-next-line no-console -- opt-in structured ops logging
    console.info(JSON.stringify({ level: 'info', ...event }));
  }
};

let sink: CrmDocumentsListV2LogSink = defaultSink;

export function setCrmDocumentsListV2LogSink(next: CrmDocumentsListV2LogSink | null): void {
  sink = next ?? defaultSink;
}

export function logCrmDocumentsListV2Event(event: CrmDocumentsListV2LogEvent): void {
  sink(event);
}
