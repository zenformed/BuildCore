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
