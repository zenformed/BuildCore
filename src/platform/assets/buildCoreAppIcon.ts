import {
  zenformedAppIconPublicSrc,
  zenformedAppIconSrc,
  type ZenformedEcosystemAppIconId,
} from '@zenformed/core/dashboard-shell';

/**
 * Launcher / branding icon for a Zenformed ecosystem app.
 * Prefer `public/zenformed-app-icons/{id}.png` so deploys pick up asset changes
 * without relying on webpack chunks from `@zenformed/core`.
 */
export function launcherAppIconSrc(id: ZenformedEcosystemAppIconId): string | undefined {
  return zenformedAppIconPublicSrc(id) ?? zenformedAppIconSrc(id);
}

/** BuildCore product icon for sidebar branding and auth shells. */
export function buildCoreAppIconSrc(): string | undefined {
  return launcherAppIconSrc('buildcore');
}
