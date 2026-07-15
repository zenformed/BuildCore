/**
 * Centralized notification destination navigation for BuildCore.
 */

export type NotificationNavigateDeps = {
  readonly push: (href: string) => void;
  readonly assign?: (url: string) => void;
  readonly origin?: string;
};

export function navigateNotificationDestination(
  destinationUrl: string,
  deps: NotificationNavigateDeps
): void {
  const trimmed = destinationUrl.trim();
  if (!trimmed) return;

  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    deps.push(trimmed);
    return;
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return;
  }

  const protocol = parsed.protocol.toLowerCase();
  if (protocol !== 'https:' && protocol !== 'http:') {
    return;
  }

  if (protocol === 'http:') {
    const host = parsed.hostname.toLowerCase();
    if (host !== 'localhost' && host !== '127.0.0.1' && host !== '[::1]') {
      return;
    }
  }

  const origin = deps.origin ?? (typeof window !== 'undefined' ? window.location.origin : '');
  if (origin && parsed.origin === origin) {
    deps.push(`${parsed.pathname}${parsed.search}${parsed.hash}`);
    return;
  }

  const assign = deps.assign ?? ((url: string) => {
    if (typeof window !== 'undefined') window.location.assign(url);
  });
  assign(parsed.toString());
}
