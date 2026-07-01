import type { CrmProjectSummary } from './project';

/** Lightweight project payload for hover preview and full details modal. */
export type CrmProjectPreview = {
  readonly summary: CrmProjectSummary;
  readonly notes: string | null;
};
