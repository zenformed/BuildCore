import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildWorkflowTaskNeedsApprovalIdempotencyKey,
  shouldNotifyWorkflowTaskNeedsApproval,
} from '../../domain/buildcore/workflowTaskNeedsApprovalNotification';
import {
  WORKFLOW_TASK_NEEDS_APPROVAL_NOTIFICATION_TITLE,
  buildWorkflowTaskNeedsApprovalNotificationBody,
} from '../../domain/buildcore/workflowTaskNeedsApprovalNotificationCopy';
import {
  buildWorkflowTaskRejectedIdempotencyKey,
  shouldNotifyWorkflowTaskRejected,
} from '../../domain/buildcore/workflowTaskRejectedNotification';
import {
  WORKFLOW_TASK_REJECTED_NOTIFICATION_TITLE,
  buildWorkflowTaskRejectedNotificationBody,
} from '../../domain/buildcore/workflowTaskRejectedNotificationCopy';
import {
  buildWorkflowTaskCompletedIdempotencyKey,
  shouldNotifyWorkflowTaskCompleted,
} from '../../domain/buildcore/workflowTaskCompletedNotification';
import {
  WORKFLOW_TASK_COMPLETED_NOTIFICATION_TITLE,
  buildWorkflowTaskCompletedNotificationBody,
} from '../../domain/buildcore/workflowTaskCompletedNotificationCopy';

describe('shouldNotifyWorkflowTaskNeedsApproval', () => {
  it('notifies when project assignee differs from actor', () => {
    assert.equal(
      shouldNotifyWorkflowTaskNeedsApproval({
        recipientUserId: 'user-b',
        actorUserId: 'user-a',
      }),
      true
    );
  });

  it('skips when no project assignee', () => {
    assert.equal(
      shouldNotifyWorkflowTaskNeedsApproval({
        recipientUserId: null,
        actorUserId: 'user-a',
      }),
      false
    );
  });

  it('skips when actor is recipient', () => {
    assert.equal(
      shouldNotifyWorkflowTaskNeedsApproval({
        recipientUserId: 'user-a',
        actorUserId: 'user-a',
      }),
      false
    );
  });
});

describe('shouldNotifyWorkflowTaskRejected', () => {
  it('notifies when member assignee differs from actor', () => {
    assert.equal(
      shouldNotifyWorkflowTaskRejected({
        recipientUserId: 'user-b',
        actorUserId: 'user-a',
      }),
      true
    );
  });

  it('skips when no member assignee', () => {
    assert.equal(
      shouldNotifyWorkflowTaskRejected({
        recipientUserId: null,
        actorUserId: 'user-a',
      }),
      false
    );
  });

  it('skips when actor is recipient', () => {
    assert.equal(
      shouldNotifyWorkflowTaskRejected({
        recipientUserId: 'user-a',
        actorUserId: 'user-a',
      }),
      false
    );
  });
});

describe('status transition in-app copy and keys', () => {
  it('builds needs-approval body and title', () => {
    assert.equal(WORKFLOW_TASK_NEEDS_APPROVAL_NOTIFICATION_TITLE, 'Task needs approval');
    assert.equal(
      buildWorkflowTaskNeedsApprovalNotificationBody({
        actorDisplayName: 'Alex',
        taskTitle: 'Install HVAC',
        projectName: 'Oak St',
        subprojectName: null,
      }),
      'Alex submitted Install HVAC for approval in Oak St.'
    );
  });

  it('builds rejected body and title', () => {
    assert.equal(WORKFLOW_TASK_REJECTED_NOTIFICATION_TITLE, 'Task rejected');
    assert.equal(
      buildWorkflowTaskRejectedNotificationBody({
        actorDisplayName: 'Alex',
        taskTitle: 'Install HVAC',
        projectName: 'Oak St',
        subprojectName: 'Unit B',
      }),
      'Alex rejected Install HVAC in Unit B of Oak St.'
    );
  });

  it('builds stable idempotency keys', () => {
    assert.equal(
      buildWorkflowTaskNeedsApprovalIdempotencyKey({
        taskId: 't1',
        recipientUserId: 'u1',
        previousStatus: 'in_progress',
        nextStatus: 'request_review',
      }),
      'workflow-task-needs-approval:t1:u1:in_progress->request_review'
    );
    assert.equal(
      buildWorkflowTaskRejectedIdempotencyKey({
        taskId: 't1',
        recipientUserId: 'u1',
        previousStatus: 'request_review',
        nextStatus: 'rejected',
      }),
      'workflow-task-rejected:t1:u1:request_review->rejected'
    );
  });
});

describe('shouldNotifyWorkflowTaskCompleted', () => {
  it('notifies when member assignee differs from actor', () => {
    assert.equal(
      shouldNotifyWorkflowTaskCompleted({
        recipientUserId: 'user-b',
        actorUserId: 'user-a',
      }),
      true
    );
  });

  it('skips when no member assignee', () => {
    assert.equal(
      shouldNotifyWorkflowTaskCompleted({
        recipientUserId: null,
        actorUserId: 'user-a',
      }),
      false
    );
  });

  it('skips when actor is recipient (self complete)', () => {
    assert.equal(
      shouldNotifyWorkflowTaskCompleted({
        recipientUserId: 'user-a',
        actorUserId: 'user-a',
      }),
      false
    );
  });
});

describe('workflow_task.completed copy and key', () => {
  it('builds completed body and idempotency key', () => {
    assert.equal(WORKFLOW_TASK_COMPLETED_NOTIFICATION_TITLE, 'Task completed');
    assert.equal(
      buildWorkflowTaskCompletedNotificationBody({
        actorDisplayName: 'Alex',
        taskTitle: 'Install HVAC',
        projectName: 'Oak St',
        subprojectName: null,
      }),
      'Alex marked Install HVAC as done in Oak St.'
    );
    assert.equal(
      buildWorkflowTaskCompletedIdempotencyKey({
        taskId: 't1',
        recipientUserId: 'u1',
        previousStatus: 'request_review',
        nextStatus: 'done',
      }),
      'workflow-task-completed:t1:u1:request_review->done'
    );
  });
});
