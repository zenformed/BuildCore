import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  BUILDCORE_NOTIFICATIONS_CORE_STYLE_BASE,
  mapCoreNotificationsUrlToBuildCoreBff,
} from './mapCoreNotificationsUrlToBff';
import { navigateNotificationDestination } from '../../presentation/features/notifications/navigateNotificationDestination';
import { shouldEnableBuildCoreNotifications } from '../../presentation/features/notifications/buildCoreNotificationsConfigGate';

describe('mapCoreNotificationsUrlToBuildCoreBff', () => {
  it('maps latest, page, unread, mark-read, and mark-all routes', () => {
    const org = 'org-abc';
    assert.equal(
      mapCoreNotificationsUrlToBuildCoreBff(
        `${BUILDCORE_NOTIFICATIONS_CORE_STYLE_BASE}/organizations/${org}/notifications/latest?limit=10`
      ),
      '/api/internal/notifications/latest?limit=10'
    );
    assert.equal(
      mapCoreNotificationsUrlToBuildCoreBff(
        `${BUILDCORE_NOTIFICATIONS_CORE_STYLE_BASE}/organizations/${org}/notifications?limit=20&cursor=c1`
      ),
      '/api/internal/notifications?limit=20&cursor=c1'
    );
    assert.equal(
      mapCoreNotificationsUrlToBuildCoreBff(
        `${BUILDCORE_NOTIFICATIONS_CORE_STYLE_BASE}/organizations/${org}/notifications/unread-count`
      ),
      '/api/internal/notifications/unread-count'
    );
    assert.equal(
      mapCoreNotificationsUrlToBuildCoreBff(
        `${BUILDCORE_NOTIFICATIONS_CORE_STYLE_BASE}/organizations/${org}/notifications/n1/read`
      ),
      '/api/internal/notifications/n1/read'
    );
    assert.equal(
      mapCoreNotificationsUrlToBuildCoreBff(
        `${BUILDCORE_NOTIFICATIONS_CORE_STYLE_BASE}/organizations/${org}/notifications/read-all`
      ),
      '/api/internal/notifications/read-all'
    );
  });

  it('discards organization path segments (BFF resolves org from session)', () => {
    const a = mapCoreNotificationsUrlToBuildCoreBff(
      `${BUILDCORE_NOTIFICATIONS_CORE_STYLE_BASE}/organizations/org-1/notifications/latest`
    );
    const b = mapCoreNotificationsUrlToBuildCoreBff(
      `${BUILDCORE_NOTIFICATIONS_CORE_STYLE_BASE}/organizations/org-2/notifications/latest`
    );
    assert.equal(a, b);
    assert.equal(a, '/api/internal/notifications/latest');
  });
});

describe('navigateNotificationDestination', () => {
  it('uses router.push for relative BuildCore routes', () => {
    const pushes: string[] = [];
    navigateNotificationDestination('/projects/acme/tasks', {
      push: (href) => pushes.push(href),
      origin: 'https://build.example.com',
    });
    assert.deepEqual(pushes, ['/projects/acme/tasks']);
  });

  it('assigns cross-app https destinations', () => {
    const assigned: string[] = [];
    navigateNotificationDestination('https://platform.zenformed.com/dashboard', {
      push: () => {
        throw new Error('should not push');
      },
      assign: (url) => assigned.push(url),
      origin: 'https://build.example.com',
    });
    assert.deepEqual(assigned, ['https://platform.zenformed.com/dashboard']);
  });

  it('converts same-origin absolute URLs to path pushes', () => {
    const pushes: string[] = [];
    navigateNotificationDestination('https://build.example.com/notifications', {
      push: (href) => pushes.push(href),
      origin: 'https://build.example.com',
    });
    assert.deepEqual(pushes, ['/notifications']);
  });

  it('rejects javascript destinations', () => {
    const pushes: string[] = [];
    navigateNotificationDestination('javascript:alert(1)', {
      push: (href) => pushes.push(href),
    });
    assert.deepEqual(pushes, []);
  });
});

describe('BuildCore notifications host config', () => {
  it('skips production notifications in demo and when auth/org are not ready', () => {
    assert.equal(
      shouldEnableBuildCoreNotifications({
        isDemoRuntime: true,
        isSaasMode: true,
        useMockAuth: false,
        hasAccessToken: true,
        membershipContextStatus: 'ready',
        organizationId: 'org-1',
        hasActiveMembership: true,
      }),
      false
    );
    assert.equal(
      shouldEnableBuildCoreNotifications({
        isDemoRuntime: false,
        isSaasMode: true,
        useMockAuth: false,
        hasAccessToken: true,
        membershipContextStatus: 'ready',
        organizationId: 'org-1',
        hasActiveMembership: true,
      }),
      true
    );
    assert.equal(
      shouldEnableBuildCoreNotifications({
        isDemoRuntime: false,
        isSaasMode: true,
        useMockAuth: false,
        hasAccessToken: false,
        membershipContextStatus: 'ready',
        organizationId: 'org-1',
        hasActiveMembership: true,
      }),
      false
    );
  });

  it('maps unread-count for background polling and leaves latest as a separate route', () => {
    const unread = mapCoreNotificationsUrlToBuildCoreBff(
      `${BUILDCORE_NOTIFICATIONS_CORE_STYLE_BASE}/organizations/org-1/notifications/unread-count`
    );
    const latest = mapCoreNotificationsUrlToBuildCoreBff(
      `${BUILDCORE_NOTIFICATIONS_CORE_STYLE_BASE}/organizations/org-1/notifications/latest?limit=10`
    );
    assert.equal(unread, '/api/internal/notifications/unread-count');
    assert.equal(latest, '/api/internal/notifications/latest?limit=10');
    assert.notEqual(unread, latest);
  });

  it('treats hasAccessToken as a boolean gate so token string churn need not rebuild enabled config', () => {
    const base = {
      isDemoRuntime: false,
      isSaasMode: true,
      useMockAuth: false,
      membershipContextStatus: 'ready',
      organizationId: 'org-1',
      hasActiveMembership: true,
    } as const;
    assert.equal(shouldEnableBuildCoreNotifications({ ...base, hasAccessToken: true }), true);
    assert.equal(shouldEnableBuildCoreNotifications({ ...base, hasAccessToken: true }), true);
    assert.equal(shouldEnableBuildCoreNotifications({ ...base, hasAccessToken: false }), false);
  });
});
