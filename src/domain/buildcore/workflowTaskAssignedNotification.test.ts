import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildWorkflowTaskAssignedIdempotencyKey,
  shouldNotifyWorkflowTaskAssigned,
} from '../../domain/buildcore/workflowTaskAssignedNotification';
import {
  WORKFLOW_TASK_ASSIGNED_NOTIFICATION_TITLE,
  buildWorkflowTaskAssignedDestinationPath,
  buildWorkflowTaskAssignedNotificationBody,
} from '../../domain/buildcore/workflowTaskAssignedNotificationCopy';
import { resolveEntityTerminology } from '../../domain/buildcore/entityTerminology';

describe('shouldNotifyWorkflowTaskAssigned', () => {
  const actor = 'user-actor';
  const userA = 'user-a';
  const userB = 'user-b';

  it('notifies create with assignee', () => {
    assert.equal(
      shouldNotifyWorkflowTaskAssigned({
        previousAssignedMemberId: null,
        nextAssignedMemberId: userB,
        actorUserId: actor,
      }),
      true
    );
  });

  it('skips create without assignee', () => {
    assert.equal(
      shouldNotifyWorkflowTaskAssigned({
        previousAssignedMemberId: null,
        nextAssignedMemberId: null,
        actorUserId: actor,
      }),
      false
    );
  });

  it('notifies null → user B', () => {
    assert.equal(
      shouldNotifyWorkflowTaskAssigned({
        previousAssignedMemberId: null,
        nextAssignedMemberId: userB,
        actorUserId: actor,
      }),
      true
    );
  });

  it('notifies user A → user B', () => {
    assert.equal(
      shouldNotifyWorkflowTaskAssigned({
        previousAssignedMemberId: userA,
        nextAssignedMemberId: userB,
        actorUserId: actor,
      }),
      true
    );
  });

  it('skips user A → same user A', () => {
    assert.equal(
      shouldNotifyWorkflowTaskAssigned({
        previousAssignedMemberId: userA,
        nextAssignedMemberId: userA,
        actorUserId: actor,
      }),
      false
    );
  });

  it('skips assigned → unassigned', () => {
    assert.equal(
      shouldNotifyWorkflowTaskAssigned({
        previousAssignedMemberId: userA,
        nextAssignedMemberId: null,
        actorUserId: actor,
      }),
      false
    );
  });

  it('skips self-assignment', () => {
    assert.equal(
      shouldNotifyWorkflowTaskAssigned({
        previousAssignedMemberId: null,
        nextAssignedMemberId: actor,
        actorUserId: actor,
      }),
      false
    );
  });
});

describe('workflow_task.assigned copy and destination', () => {
  it('builds plain-text title and body with and without subproject', () => {
    assert.equal(WORKFLOW_TASK_ASSIGNED_NOTIFICATION_TITLE, 'Workflow task assigned');
    assert.equal(
      buildWorkflowTaskAssignedNotificationBody({
        actorDisplayName: 'Julie Smith',
        taskTitle: 'Final Inspection',
        projectName: 'Downtown Apartments',
        subprojectName: 'Unit 24',
      }),
      'Julie Smith assigned you to Final Inspection in Unit 24 of Downtown Apartments.'
    );
    assert.equal(
      buildWorkflowTaskAssignedNotificationBody({
        actorDisplayName: 'Julie Smith',
        taskTitle: 'Final Inspection',
        projectName: 'Spring Bridal Show',
        subprojectName: null,
      }),
      'Julie Smith assigned you to Final Inspection in Spring Bridal Show.'
    );
  });

  it('keeps renamed entity terminology available for org-configured display words', () => {
    const terms = resolveEntityTerminology({ project: 'Show', subproject: 'Lead' });
    assert.equal(terms.project, 'Show');
    assert.equal(terms.subproject, 'Lead');
    // Body uses entity names (Lead 24 / Spring Bridal Show), not the word labels.
    assert.equal(
      buildWorkflowTaskAssignedNotificationBody({
        actorDisplayName: 'Julie Smith',
        taskTitle: 'Final Inspection',
        projectName: 'Spring Bridal Show',
        subprojectName: 'Lead 24',
      }),
      'Julie Smith assigned you to Final Inspection in Lead 24 of Spring Bridal Show.'
    );
  });

  it('builds relative destination paths for tasks', () => {
    assert.equal(
      buildWorkflowTaskAssignedDestinationPath({
        parentRouteSlug: 'downtown',
        subSlug: 'unit-24',
      }),
      '/projects/downtown/unit-24/tasks'
    );
    assert.equal(
      buildWorkflowTaskAssignedDestinationPath({
        parentRouteSlug: 'spring-show',
        subSlug: null,
      }),
      '/projects/spring-show/tasks'
    );
  });
});

describe('workflow_task.assigned idempotency key', () => {
  it('is stable for retries and distinct for later reassignments', () => {
    const key1 = buildWorkflowTaskAssignedIdempotencyKey({
      taskId: 'task-1',
      recipientUserId: 'user-b',
      assignedAt: '2026-07-15T12:00:00.000Z',
    });
    const key1Retry = buildWorkflowTaskAssignedIdempotencyKey({
      taskId: 'task-1',
      recipientUserId: 'user-b',
      assignedAt: '2026-07-15T12:00:00.000Z',
    });
    const key2 = buildWorkflowTaskAssignedIdempotencyKey({
      taskId: 'task-1',
      recipientUserId: 'user-b',
      assignedAt: '2026-07-16T09:00:00.000Z',
    });
    assert.equal(key1, key1Retry);
    assert.notEqual(key1, key2);
    assert.match(key1, /^workflow-task-assigned:task-1:user-b:2026-07-15T12:00:00.000Z$/);
  });
});
