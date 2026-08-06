/**
 * Structured observability for Photos list v2.
 * Never log PII, filenames, search text, storage paths, locations, EXIF, or cursor payloads.
 */

export type CrmPhotosListV2CursorFailureCategory =
  | 'malformed'
  | 'bad_signature'
  | 'wrong_org'
  | 'wrong_fingerprint'
  | 'wrong_limit'
  | 'wrong_type'
  | 'expired'
  | 'misconfigured_secret';

export type CrmPhotosListV2LogEvent =
  | {
      readonly name: 'crm.photos_list_v2.query';
      readonly durationMs: number;
      readonly rowsReturned: number;
      readonly requestedLimit: number;
      readonly direction: 'forward' | 'first';
      readonly searchActive: boolean;
      readonly payloadBytesApprox?: number;
      readonly unexpectedlyShortPage?: boolean;
    }
  | {
      readonly name: 'crm.photos_list_v2.cursor_invalid';
      readonly category: CrmPhotosListV2CursorFailureCategory;
    }
  | {
      readonly name: 'crm.photos_list_v2.duplicate_rows';
      readonly duplicateCount: number;
    }
  | {
      readonly name:
        | 'crm.photos_list_v2.auth_failure'
        | 'crm.photos_list_v2.db_failure'
        | 'crm.photos_list_v2.cancelled'
        | 'crm.photos_list_v2.empty_page';
      readonly code?: string;
    };

export type CrmPhotosListV2LogSink = (event: CrmPhotosListV2LogEvent) => void;

const defaultSink: CrmPhotosListV2LogSink = (event) => {
  if (process.env.BUILDCORE_PHOTOS_LIST_V2_LOGS === 'true') {
    // eslint-disable-next-line no-console -- opt-in structured ops logging
    console.info(JSON.stringify({ level: 'info', ...event }));
  }
};

let sink: CrmPhotosListV2LogSink = defaultSink;

export function setCrmPhotosListV2LogSink(next: CrmPhotosListV2LogSink | null): void {
  sink = next ?? defaultSink;
}

export function logCrmPhotosListV2Event(event: CrmPhotosListV2LogEvent): void {
  sink(event);
}
