/**
 * Maps package Core-style notification URLs onto BuildCore flat BFF routes.
 * Organization is resolved server-side; path org ids are discarded.
 */

const CORE_STYLE_HOST = 'zenformed-notifications.invalid';

export const BUILDCORE_NOTIFICATIONS_CORE_STYLE_BASE = `https://${CORE_STYLE_HOST}`;

export function mapCoreNotificationsUrlToBuildCoreBff(inputUrl: string): string {
  let url: URL;
  try {
    url = new URL(inputUrl);
  } catch {
    return '/api/internal/notifications';
  }

  const path = url.pathname.replace(/\/+$/, '') || '/';
  const search = url.search;

  const markRead = /^\/organizations\/[^/]+\/notifications\/([^/]+)\/read$/.exec(path);
  if (markRead) {
    return `/api/internal/notifications/${encodeURIComponent(markRead[1])}/read${search}`;
  }

  if (/^\/organizations\/[^/]+\/notifications\/latest$/.test(path)) {
    return `/api/internal/notifications/latest${search}`;
  }
  if (/^\/organizations\/[^/]+\/notifications\/unread-count$/.test(path)) {
    return `/api/internal/notifications/unread-count${search}`;
  }
  if (/^\/organizations\/[^/]+\/notifications\/read-all$/.test(path)) {
    return `/api/internal/notifications/read-all${search}`;
  }
  if (/^\/organizations\/[^/]+\/notifications$/.test(path)) {
    return `/api/internal/notifications${search}`;
  }

  return `/api/internal/notifications${search}`;
}
