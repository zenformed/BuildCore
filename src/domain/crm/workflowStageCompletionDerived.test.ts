import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  countIncompleteWorkflowTasks,
  isWorkflowStageCompleteByTasks,
  isWorkflowTaskComplete,
  listIncompleteWorkflowStages,
  projectStatusCompletionNeedsConfirmation,
} from '@/domain/buildcore/projectPipelineProgress';
import { resolveWorkflowStageCompletionState } from '@/domain/crm/projectStageCompletion';
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

describe('shared workflow task completion rule', () => {
  it('treats status done as complete', () => {
    assert.equal(isWorkflowTaskComplete({ status: 'done' }), true);
    assert.equal(isWorkflowTaskComplete({ status: 'pending' }), false);
    assert.equal(isWorkflowTaskComplete({ status: 'skipped' }), false);
  });

  it('stage with all tasks complete → derived complete', () => {
    const tasks = [
      task({ id: '1', status: 'done', stageSlug: 'a' }),
      task({ id: '2', status: 'done', stageSlug: 'a' }),
    ];
    assert.equal(isWorkflowStageCompleteByTasks(tasks), true);
    assert.equal(
      resolveWorkflowStageCompletionState({
        stageSlug: 'a',
        tasks,
        manualCompletions: [],
      }).isComplete,
      true
    );
  });

  it('stage with one incomplete task → derived incomplete', () => {
    const tasks = [
      task({ id: '1', status: 'done', stageSlug: 'a' }),
      task({ id: '2', status: 'pending', stageSlug: 'a' }),
    ];
    assert.equal(isWorkflowStageCompleteByTasks(tasks), false);
    assert.equal(
      resolveWorkflowStageCompletionState({
        stageSlug: 'a',
        tasks,
        manualCompletions: [],
      }).isComplete,
      false
    );
  });

  it('empty stage is not complete and does not block Project Completed incompleteness lists', () => {
    const state = resolveWorkflowStageCompletionState({
      stageSlug: 'a',
      tasks: [],
      manualCompletions: [{ stageSlug: 'a' }],
    });
    assert.equal(state.isComplete, false);
    assert.equal(state.taskCount, 0);
    assert.equal(isWorkflowStageCompleteByTasks([]), false);

    const incomplete = listIncompleteWorkflowStages({
      workflowTasks: [],
      stages: [{ slug: 'a', label: 'A', sortOrder: 1 }],
      manualStageCompletions: [],
    });
    assert.deepEqual(incomplete, []);
  });
});

describe('project completed confirmation helpers', () => {
  it('no warning when all ops tasks are complete', () => {
    const tasks = [task({ id: '1', status: 'done', stageSlug: 'a' })];
    assert.equal(countIncompleteWorkflowTasks(tasks), 0);
    assert.equal(projectStatusCompletionNeedsConfirmation(tasks), false);
  });

  it('warning needed when incomplete ops tasks remain', () => {
    const withPayment = [
      task({ id: '1', status: 'done', stageSlug: 'a' }),
      task({ id: '2', status: 'pending', stageSlug: 'a' }),
      { ...task({ id: '3', status: 'pending', stageSlug: 'payments' }), amountCents: 500 },
    ] as CrmWorkflowTask[];
    assert.equal(countIncompleteWorkflowTasks(withPayment), 1);
    assert.equal(projectStatusCompletionNeedsConfirmation(withPayment), true);
  });
});
