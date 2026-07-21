/**
 * Documents tab list vs gallery preference (project-agnostic so it survives
 * parent ↔ subproject navigation).
 */

const STORAGE_KEY = 'buildcore.crm.documentsView.v1';

export type DocumentsViewMode = 'list' | 'gallery';

function isDocumentsViewMode(value: unknown): value is DocumentsViewMode {
  return value === 'list' || value === 'gallery';
}

export function readDocumentsViewMode(): DocumentsViewMode {
  if (typeof window === 'undefined') return 'list';
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (isDocumentsViewMode(raw)) return raw;
  } catch {
    /* ignore */
  }
  return 'list';
}

export function writeDocumentsViewMode(mode: DocumentsViewMode): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    /* ignore */
  }
}
