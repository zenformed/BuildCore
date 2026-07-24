/**
 * Status transition guards for spreadsheet import jobs/groups/rows.
 */

import type {
  CrmImportGroupStatus,
  CrmImportJobStatus,
  CrmImportRowStatus,
} from '@/domain/crm/spreadsheetImportTypes';

const JOB_TRANSITIONS: Readonly<Record<CrmImportJobStatus, readonly CrmImportJobStatus[]>> = {
  draft: ['ready', 'cancelled', 'failed'],
  ready: ['running', 'cancelled', 'draft'],
  running: ['partially_completed', 'completed', 'failed', 'cancelled'],
  partially_completed: ['running', 'completed', 'failed', 'cancelled'],
  completed: [],
  failed: [],
  cancelled: [],
};

const GROUP_TRANSITIONS: Readonly<Record<CrmImportGroupStatus, readonly CrmImportGroupStatus[]>> = {
  unresolved: ['ready', 'ignored', 'failed'],
  ready: ['running', 'ignored', 'unresolved'],
  ignored: ['ready', 'unresolved'],
  running: ['completed', 'partially_completed', 'failed'],
  completed: [],
  partially_completed: ['running', 'completed', 'failed'],
  failed: [],
};

const ROW_TRANSITIONS: Readonly<Record<CrmImportRowStatus, readonly CrmImportRowStatus[]>> = {
  pending: ['excluded', 'invalid', 'running'],
  excluded: [],
  invalid: [],
  running: ['succeeded', 'failed'],
  succeeded: [],
  failed: [],
};

export class CrmImportStatusTransitionError extends Error {
  constructor(
    readonly entity: 'job' | 'group' | 'row',
    readonly from: string,
    readonly to: string
  ) {
    super(`Invalid ${entity} status transition: ${from} → ${to}`);
    this.name = 'CrmImportStatusTransitionError';
  }
}

export function assertJobStatusTransition(from: CrmImportJobStatus, to: CrmImportJobStatus): void {
  if (from === to) return;
  if (!JOB_TRANSITIONS[from].includes(to)) {
    throw new CrmImportStatusTransitionError('job', from, to);
  }
}

export function assertGroupStatusTransition(
  from: CrmImportGroupStatus,
  to: CrmImportGroupStatus
): void {
  if (from === to) return;
  if (!GROUP_TRANSITIONS[from].includes(to)) {
    throw new CrmImportStatusTransitionError('group', from, to);
  }
}

export function assertRowStatusTransition(from: CrmImportRowStatus, to: CrmImportRowStatus): void {
  if (from === to) return;
  if (!ROW_TRANSITIONS[from].includes(to)) {
    throw new CrmImportStatusTransitionError('row', from, to);
  }
}
