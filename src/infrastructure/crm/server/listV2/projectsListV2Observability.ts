/**
 * Structured observability events for Projects/Subprojects list v2.
 * Never log PII, raw search, cursor payloads, or full cursor strings.
 */

import type { CrmProjectsListV2SortMode, CrmProjectsListV2View } from '@/domain/crm/projectsListV2';

export type CrmProjectsListV2CursorFailureCategory =
  | 'malformed'
  | 'bad_signature'
  | 'wrong_org'
  | 'wrong_view'
  | 'wrong_parent'
  | 'wrong_fingerprint'
  | 'wrong_sort'
  | 'unsupported_version'
  | 'expired'
  | 'misconfigured_secret';

export type CrmProjectsListV2LogEventName =
  | 'crm.projects_list_v2.query'
  | 'crm.projects_list_v2.count'
  | 'crm.projects_list_v2.summaries'
  | 'crm.projects_list_v2.cursor_invalid'
  | 'crm.projects_list_v2.auth_failure'
  | 'crm.projects_list_v2.db_failure'
  | 'crm.projects_list_v2.cancelled'
  | 'crm.projects_list_v2.empty_page';

export type CrmProjectsListV2ActiveFilterNames = {
  readonly stageSlugs: boolean;
  readonly priorities: boolean;
  readonly workflowTaskStatuses: boolean;
  readonly assignedMemberIds: boolean;
  readonly projectStatuses: boolean;
  readonly search: boolean;
};

export type CrmProjectsListV2TimingEvent = {
  readonly name:
    | 'crm.projects_list_v2.query'
    | 'crm.projects_list_v2.count'
    | 'crm.projects_list_v2.summaries';
  readonly durationMs: number;
  readonly rowsReturned?: number;
  readonly requestedLimit?: number;
  readonly payloadBytes?: number;
  readonly view: CrmProjectsListV2View;
  readonly sort: CrmProjectsListV2SortMode;
  readonly direction?: 'forward' | 'backward' | 'first';
  readonly activeFilters: CrmProjectsListV2ActiveFilterNames;
};

export type CrmProjectsListV2CursorInvalidEvent = {
  readonly name: 'crm.projects_list_v2.cursor_invalid';
  readonly category: CrmProjectsListV2CursorFailureCategory;
  readonly view?: CrmProjectsListV2View;
};

export type CrmProjectsListV2FailureEvent = {
  readonly name:
    | 'crm.projects_list_v2.auth_failure'
    | 'crm.projects_list_v2.db_failure'
    | 'crm.projects_list_v2.cancelled'
    | 'crm.projects_list_v2.empty_page';
  readonly view?: CrmProjectsListV2View;
  readonly sort?: CrmProjectsListV2SortMode;
  readonly code?: string;
};

export type CrmProjectsListV2LogEvent =
  | CrmProjectsListV2TimingEvent
  | CrmProjectsListV2CursorInvalidEvent
  | CrmProjectsListV2FailureEvent;

export type CrmProjectsListV2LogSink = (event: CrmProjectsListV2LogEvent) => void;

const defaultSink: CrmProjectsListV2LogSink = (event) => {
  // Structured one-line JSON for log aggregators; no console spam in hot paths unless sink wired.
  if (process.env.BUILDCORE_PROJECTS_LIST_V2_LOGS === 'true') {
    // eslint-disable-next-line no-console -- opt-in structured ops logging
    console.info(JSON.stringify({ level: 'info', ...event }));
  }
};

let sink: CrmProjectsListV2LogSink = defaultSink;

/** Test/helper override. */
export function setCrmProjectsListV2LogSink(next: CrmProjectsListV2LogSink | null): void {
  sink = next ?? defaultSink;
}

export function logCrmProjectsListV2Event(event: CrmProjectsListV2LogEvent): void {
  sink(event);
}

export function activeFilterNamesFromRequest(input: {
  readonly search: string | null;
  readonly filters: {
    readonly stageSlugs: readonly unknown[];
    readonly priorities: readonly unknown[];
    readonly workflowTaskStatuses: readonly unknown[];
    readonly assignedMemberIds: readonly unknown[];
    readonly projectStatuses: readonly unknown[];
  };
}): CrmProjectsListV2ActiveFilterNames {
  return {
    stageSlugs: input.filters.stageSlugs.length > 0,
    priorities: input.filters.priorities.length > 0,
    workflowTaskStatuses: input.filters.workflowTaskStatuses.length > 0,
    assignedMemberIds: input.filters.assignedMemberIds.length > 0,
    projectStatuses: input.filters.projectStatuses.length > 0,
    search: input.search != null,
  };
}
