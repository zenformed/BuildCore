import type { CrmProjectDetail } from '@/domain/crm';
import type { OrgPipelineStageRecord } from '@/domain/buildcore/orgPipelineStages';

export const DEMO_SESSION_STORAGE_KEY = 'buildcore_demo_session_v1';

export type DemoPipelineStagesSnapshot = {
  readonly project: readonly OrgPipelineStageRecord[];
  readonly subproject: readonly OrgPipelineStageRecord[];
};

export type DemoSessionSnapshot = {
  readonly version: 1;
  readonly sessionId: string;
  readonly projectOverrides: Record<string, CrmProjectDetail>;
  readonly archivedSlugs?: readonly string[];
  readonly pipelineStages?: DemoPipelineStagesSnapshot;
  readonly updatedAt: string;
};

export type DemoSessionStore = {
  readonly sessionId: string;
  readonly projectOverrides: ReadonlyMap<string, CrmProjectDetail>;
  readonly archivedSlugs: readonly string[];
  readonly pipelineStages: DemoPipelineStagesSnapshot | null;
};

let activePipelineStagesOverride: DemoPipelineStagesSnapshot | null = null;

export function getActivePipelineStagesOverride(): DemoPipelineStagesSnapshot | null {
  return activePipelineStagesOverride;
}

export function setActivePipelineStagesOverride(
  next: DemoPipelineStagesSnapshot | null
): void {
  activePipelineStagesOverride = next;
}

export function clearActivePipelineStagesOverride(): void {
  activePipelineStagesOverride = null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function parsePipelineStageRecord(value: unknown): OrgPipelineStageRecord | null {
  if (!isRecord(value)) return null;
  if (typeof value.id !== 'string') return null;
  if (typeof value.organizationId !== 'string') return null;
  if (value.stageScope !== 'project' && value.stageScope !== 'subproject') return null;
  if (typeof value.slug !== 'string') return null;
  if (typeof value.label !== 'string') return null;
  if (typeof value.sortOrder !== 'number') return null;
  if (typeof value.isActive !== 'boolean') return null;
  return {
    id: value.id,
    organizationId: value.organizationId,
    stageScope: value.stageScope,
    slug: value.slug,
    label: value.label,
    sortOrder: value.sortOrder,
    isActive: value.isActive,
  };
}

function parsePipelineStagesSnapshot(value: unknown): DemoPipelineStagesSnapshot | undefined {
  if (!isRecord(value)) return undefined;
  if (!Array.isArray(value.project) || !Array.isArray(value.subproject)) return undefined;
  const project = value.project
    .map(parsePipelineStageRecord)
    .filter((stage): stage is OrgPipelineStageRecord => stage != null);
  const subproject = value.subproject
    .map(parsePipelineStageRecord)
    .filter((stage): stage is OrgPipelineStageRecord => stage != null);
  if (project.length === 0 && subproject.length === 0) return undefined;
  return { project, subproject };
}

function parseDemoSessionSnapshot(raw: string): DemoSessionSnapshot | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return null;
    if (parsed.version !== 1) return null;
    if (typeof parsed.sessionId !== 'string' || parsed.sessionId.trim() === '') return null;
    if (!isRecord(parsed.projectOverrides)) return null;
    if (typeof parsed.updatedAt !== 'string') return null;

    const projectOverrides: Record<string, CrmProjectDetail> = {};
    for (const [slug, detail] of Object.entries(parsed.projectOverrides)) {
      if (detail != null && typeof detail === 'object') {
        projectOverrides[slug] = detail as CrmProjectDetail;
      }
    }

    const archivedSlugs = Array.isArray(parsed.archivedSlugs)
      ? parsed.archivedSlugs.filter((slug): slug is string => typeof slug === 'string')
      : [];

    const pipelineStages = parsePipelineStagesSnapshot(parsed.pipelineStages);

    return {
      version: 1,
      sessionId: parsed.sessionId,
      projectOverrides,
      archivedSlugs,
      pipelineStages,
      updatedAt: parsed.updatedAt,
    };
  } catch {
    return null;
  }
}

export function readDemoSessionSnapshot(): DemoSessionSnapshot | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(DEMO_SESSION_STORAGE_KEY);
  if (raw == null || raw.trim() === '') return null;
  return parseDemoSessionSnapshot(raw);
}

export function writeDemoSessionSnapshot(snapshot: DemoSessionSnapshot): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(DEMO_SESSION_STORAGE_KEY, JSON.stringify(snapshot));
}

export function clearDemoSessionStorage(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(DEMO_SESSION_STORAGE_KEY);
}

export function createDemoSessionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `demo-${Date.now()}`;
}

export function loadOrCreateDemoSessionStore(): DemoSessionStore {
  const existing = readDemoSessionSnapshot();
  if (existing != null) {
    if (activePipelineStagesOverride == null) {
      activePipelineStagesOverride = existing.pipelineStages ?? null;
    }
    return {
      sessionId: existing.sessionId,
      projectOverrides: new Map(Object.entries(existing.projectOverrides)),
      archivedSlugs: existing.archivedSlugs ?? [],
      pipelineStages: activePipelineStagesOverride,
    };
  }

  activePipelineStagesOverride = null;
  return {
    sessionId: createDemoSessionId(),
    projectOverrides: new Map(),
    archivedSlugs: [],
    pipelineStages: null,
  };
}

export function serializeDemoSessionStore(
  sessionId: string,
  projectOverrides: ReadonlyMap<string, CrmProjectDetail>,
  archivedSlugs: ReadonlySet<string> = new Set(),
  pipelineStages: DemoPipelineStagesSnapshot | null = getActivePipelineStagesOverride()
): DemoSessionSnapshot {
  const projectOverridesRecord: Record<string, CrmProjectDetail> = {};
  for (const [slug, detail] of projectOverrides.entries()) {
    projectOverridesRecord[slug] = detail;
  }
  return {
    version: 1,
    sessionId,
    projectOverrides: projectOverridesRecord,
    archivedSlugs: [...archivedSlugs],
    ...(pipelineStages != null ? { pipelineStages } : {}),
    updatedAt: new Date().toISOString(),
  };
}
