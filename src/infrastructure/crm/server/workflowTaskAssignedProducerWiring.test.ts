import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('workflow_task.assigned producer wiring', () => {
  it('create and patch task routes dispatch in-app assignment notifications', () => {
    const createRoute = readFileSync(
      join(process.cwd(), 'app/api/crm/projects/[slug]/tasks/route.ts'),
      'utf8'
    );
    const patchRoute = readFileSync(
      join(process.cwd(), 'app/api/crm/tasks/[taskId]/route.ts'),
      'utf8'
    );
    assert.match(createRoute, /dispatchWorkflowTaskAssignedInAppNotification/);
    assert.match(patchRoute, /dispatchWorkflowTaskAssignedInAppNotification/);
    assert.match(patchRoute, /previousAssignedMemberId/);
  });

  it('demo runtime skips Core create in orchestration helper', () => {
    const source = readFileSync(
      join(
        process.cwd(),
        'src/infrastructure/crm/server/notifyWorkflowTaskAssignedInApp.ts'
      ),
      'utf8'
    );
    assert.match(source, /isDemoRuntime/);
    assert.match(source, /must not call production/);
    assert.match(source, /createPlatformNotificationOnCore/);
  });

  it('does not expose a browser create notification route', () => {
    const notificationsRoot = join(process.cwd(), 'app/api/internal/notifications');
    const relay = readFileSync(join(notificationsRoot, 'notificationsRelay.ts'), 'utf8');
    assert.doesNotMatch(relay, /createPlatformNotificationOnCore/);
    assert.doesNotMatch(relay, /POST.*create/);
  });
});

describe('status-transition + notify-email in-app producer wiring', () => {
  it('patch status dispatcher calls email and in-app for needs_approval/rejected', () => {
    const source = readFileSync(
      join(
        process.cwd(),
        'src/infrastructure/crm/server/workflowTaskStatusTransitionNotifications.ts'
      ),
      'utf8'
    );
    assert.match(source, /notifyWorkflowTaskNeedsApprovalAfterTransition/);
    assert.match(source, /notifyWorkflowTaskRejectedAfterTransition/);
    assert.match(source, /dispatchWorkflowTaskStatusTransitionInAppNotifications/);
  });

  it('needs_approval and rejected in-app helpers create platform notifications', () => {
    const needsApproval = readFileSync(
      join(
        process.cwd(),
        'src/infrastructure/crm/server/notifyWorkflowTaskNeedsApprovalInApp.ts'
      ),
      'utf8'
    );
    const rejected = readFileSync(
      join(process.cwd(), 'src/infrastructure/crm/server/notifyWorkflowTaskRejectedInApp.ts'),
      'utf8'
    );
    assert.match(needsApproval, /createPlatformNotificationOnCore/);
    assert.match(needsApproval, /workflow_task\.needs_approval/);
    assert.match(rejected, /createPlatformNotificationOnCore/);
    assert.match(rejected, /workflow_task\.rejected/);
  });

  it('completed in-app helper creates platform notification with no email relay', () => {
    const completed = readFileSync(
      join(process.cwd(), 'src/infrastructure/crm/server/notifyWorkflowTaskCompletedInApp.ts'),
      'utf8'
    );
    const statusDispatch = readFileSync(
      join(
        process.cwd(),
        'src/infrastructure/crm/server/workflowTaskStatusTransitionNotifications.ts'
      ),
      'utf8'
    );
    assert.match(completed, /createPlatformNotificationOnCore/);
    assert.match(completed, /workflow_task\.completed/);
    assert.match(completed, /In-app only/);
    assert.match(statusDispatch, /enteredCompleted/);
    assert.doesNotMatch(statusDispatch, /notifyWorkflowTaskCompletedAfterTransition/);
  });

  it('notify-assigned route ensures in-app after member email', () => {
    const route = readFileSync(
      join(process.cwd(), 'app/api/crm/tasks/[taskId]/notify-assigned/route.ts'),
      'utf8'
    );
    assert.match(route, /dispatchWorkflowTaskAssignedNotifyEmailInApp/);
  });
});
