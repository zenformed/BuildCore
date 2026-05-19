import type { WorkflowStageCollapseKey } from '@/domain/crm';



const STORAGE_KEY = 'buildcore.crm.workflowStageCollapse.v1';



/** projectSlug → collapseKey → expanded */

type PersistedMap = Record<string, Partial<Record<WorkflowStageCollapseKey, boolean>>>;



const listeners = new Set<() => void>();



function emitChange(): void {

  listeners.forEach((listener) => listener());

}



export function subscribeWorkflowStageCollapse(listener: () => void): () => void {

  listeners.add(listener);

  return () => listeners.delete(listener);

}



function readAll(): PersistedMap {

  if (typeof window === 'undefined') return {};

  try {

    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) return {};

    const parsed = JSON.parse(raw) as PersistedMap;

    return parsed && typeof parsed === 'object' ? parsed : {};

  } catch {

    return {};

  }

}



function writeAll(data: PersistedMap): void {

  if (typeof window === 'undefined') return;

  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

  emitChange();

}



/** `true` = expanded (default when unset). */

export function readWorkflowStageExpanded(

  projectSlug: string,

  collapseKey: WorkflowStageCollapseKey

): boolean {

  const value = readAll()[projectSlug]?.[collapseKey];

  return value !== false;

}



export function writeWorkflowStageExpanded(

  projectSlug: string,

  collapseKey: WorkflowStageCollapseKey,

  expanded: boolean

): void {

  const all = readAll();

  const project = { ...all[projectSlug], [collapseKey]: expanded };

  writeAll({ ...all, [projectSlug]: project });

}

