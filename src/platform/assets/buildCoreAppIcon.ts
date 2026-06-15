import {
  zenformedAppIconPublicSrc,
  zenformedAppIconSrc,
} from '@zenformed/core/dashboard-shell';

/**
 * BuildCore product icon for sidebar branding and auth shells.
 * Prefer `public/zenformed-app-icons/buildcore.png` so deploys pick up asset changes
 * without relying on a separate webpack chunk from `@zenformed/core`.
 */
export function buildCoreAppIconSrc(): string | undefined {
  return zenformedAppIconPublicSrc('buildcore') ?? zenformedAppIconSrc('buildcore');
}
