/**
 * Pure helpers for the Zenformed Test App dashboard (no React, no I/O).
 */

export function computeIsAdmin(
  isSaasMode: boolean,
  user: { id?: string; email?: string } | null | undefined
): boolean {
  return isSaasMode ? Boolean(user) : false;
}

