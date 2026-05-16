import type { ZenformedAppDefinition } from './types';
import buildcoreAppRuntime from './buildcore-app-runtime.json';

/**
 * BuildCore — Zenformed consuming app shell. **`appSlug`** must match **`platform_apps.slug`** in ZenformedCore.
 * JSON is the Electron-readable manifest; Next imports this module.
 */
export const buildcoreAppDefinition = buildcoreAppRuntime satisfies ZenformedAppDefinition;

export type BuildCoreAppDefinition = typeof buildcoreAppDefinition;
