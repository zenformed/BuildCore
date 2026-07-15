import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const notificationsApiRoot = join(
  process.cwd(),
  'app',
  'api',
  'internal',
  'notifications'
);

function collectRouteFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      collectRouteFiles(full, out);
    } else if (name === 'route.ts') {
      out.push(full);
    }
  }
  return out;
}

describe('notifications BFF route surface', () => {
  it('exposes only the five consumer routes and no create route', () => {
    const routes = collectRouteFiles(notificationsApiRoot).map((p) =>
      p.replace(/\\/g, '/').split('/app/api/internal/notifications/')[1]
    );
    assert.deepEqual(routes.sort(), [
      '[notificationId]/read/route.ts',
      'latest/route.ts',
      'read-all/route.ts',
      'route.ts',
      'unread-count/route.ts',
    ]);
  });

  it('relay resolves organization from membership context, not browser body', () => {
    const relaySource = readFileSync(join(notificationsApiRoot, 'notificationsRelay.ts'), 'utf8');
    assert.match(relaySource, /fetchAuthoritativeMembershipContext/);
    assert.match(relaySource, /organizationId/);
    assert.doesNotMatch(relaySource, /recipientUserId/);
    assert.doesNotMatch(relaySource, /createPlatformNotification/);
  });

  it('mark-read uses path notification id only', () => {
    const markRead = readFileSync(
      join(notificationsApiRoot, '[notificationId]', 'read', 'route.ts'),
      'utf8'
    );
    assert.match(markRead, /postCoreNotificationMarkRead/);
    assert.match(markRead, /notificationId/);
  });
});
