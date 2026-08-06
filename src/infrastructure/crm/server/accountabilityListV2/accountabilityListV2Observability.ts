/**
 * Structured observability for Accountability list v2.
 * Never log PII, raw search, cursor payloads, or summaries.
 */

export type CrmAccountabilityListV2CursorFailureCategory =
  | 'malformed'
  | 'bad_signature'
  | 'wrong_org'
  | 'wrong_project'
  | 'wrong_fingerprint'
  | 'wrong_limit'
  | 'wrong_type'
  | 'expired'
  | 'misconfigured_secret';

export type CrmAccountabilityListV2LogEvent =
  | {
      readonly name: 'crm.accountability_list_v2.query';
      readonly durationMs: number;
      readonly rowsReturned: number;
      readonly requestedLimit: number;
      readonly direction: 'forward' | 'first';
      readonly searchActive: boolean;
    }
  | {
      readonly name: 'crm.accountability_list_v2.cursor_invalid';
      readonly category: CrmAccountabilityListV2CursorFailureCategory;
    }
  | {
      readonly name:
        | 'crm.accountability_list_v2.auth_failure'
        | 'crm.accountability_list_v2.db_failure'
        | 'crm.accountability_list_v2.cancelled'
        | 'crm.accountability_list_v2.empty_page';
      readonly code?: string;
    };

export type CrmAccountabilityListV2LogSink = (event: CrmAccountabilityListV2LogEvent) => void;

const defaultSink: CrmAccountabilityListV2LogSink = (event) => {
  if (process.env.BUILDCORE_PROJECTS_LIST_V2_LOGS === 'true') {
    // eslint-disable-next-line no-console -- opt-in structured ops logging
    console.info(JSON.stringify({ level: 'info', ...event }));
  }
};

let sink: CrmAccountabilityListV2LogSink = defaultSink;

export function setCrmAccountabilityListV2LogSink(
  next: CrmAccountabilityListV2LogSink | null
): void {
  sink = next ?? defaultSink;
}

export function logCrmAccountabilityListV2Event(event: CrmAccountabilityListV2LogEvent): void {
  sink(event);
}
