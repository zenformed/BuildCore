import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { CrmApiError } from '@/infrastructure/crm/api/crmApiClient';
import {
  incompleteTaskCountFromConfirmationError,
  isCrmProjectCompletionConfirmationRequired,
} from './crmProjectCompletionConfirmation';
import {
  countCompletedWorkflowStages,
  listWorkflowStageCompletionStatuses,
  resolveDerivedCurrentWorkflowStageSlug,
  resolveWorkflowPipelineGraphState,
} from '@/domain/buildcore/projectPipelineProgress';
import type { CrmWorkflowTask } from '@/domain/crm';

function task(
  overrides: Partial<CrmWorkflowTask> & Pick<CrmWorkflowTask, 'id' | 'status' | 'stageSlug'>
): CrmWorkflowTask {
  return {
    title: overrides.id,
    documentsRequired: false,
    notes: null,
    assignedTo: null,
    amountCents: null,
    ...overrides,
  } as CrmWorkflowTask;
}

const STAGES = [
  { slug: 's1', label: 'One', sortOrder: 1 },
  { slug: 's2', label: 'Two', sortOrder: 2 },
  { slug: 's3', label: 'Three', sortOrder: 3 },
] as const;

describe('crmProjectCompletionConfirmation', () => {
  it('recognizes confirmation_required and reads incompleteTaskCount', () => {
    const error = new CrmApiError('confirmation_required', 409, 'warn', {
      incompleteTaskCount: 3,
    });
    assert.equal(isCrmProjectCompletionConfirmationRequired(error), true);
    assert.equal(incompleteTaskCountFromConfirmationError(error), 3);
  });

  it('does not treat unrelated API errors as confirmation', () => {
    const error = new CrmApiError('internal_error', 500, 'boom');
    assert.equal(isCrmProjectCompletionConfirmationRequired(error), false);
  });
});

describe('pipeline visual catalog vs completion skip', () => {
  it('always lists every configured stage even when empty', () => {
    const statuses = listWorkflowStageCompletionStatuses({
      workflowTasks: [task({ id: '1', status: 'done', stageSlug: 's1' })],
      stages: STAGES,
      manualStageCompletions: [],
    });
    assert.equal(statuses.length, 3);
    assert.equal(statuses[0]?.isComplete, true);
    assert.equal(statuses[1]?.isComplete, false);
    assert.equal(statuses[1]?.taskCount, 0);
    assert.equal(statuses[2]?.taskCount, 0);
  });

  it('keeps Stage X of N over the full configured catalog', () => {
    const counted = countCompletedWorkflowStages({
      workflowTasks: [task({ id: '1', status: 'done', stageSlug: 's1' })],
      stages: STAGES,
      manualStageCompletions: [],
    });
    assert.equal(counted.totalActiveStageCount, 3);
    assert.equal(counted.completedStageCount, 1);
  });

  it('treats the next empty stage as current after earlier tasks complete', () => {
    const graph = resolveWorkflowPipelineGraphState({
      workflowTasks: [task({ id: '1', status: 'done', stageSlug: 's1' })],
      stages: STAGES,
      manualStageCompletions: [],
    });
    assert.equal(graph.stageStatuses.length, 3);
    assert.equal(graph.derivedCurrentStageSlug, 's2');
    assert.equal(
      resolveDerivedCurrentWorkflowStageSlug(graph.stageStatuses),
      's2'
    );
  });
});
