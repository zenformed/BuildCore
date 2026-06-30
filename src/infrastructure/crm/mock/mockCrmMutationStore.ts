import { applyPaymentBalanceToProjectDetail, completedStagesThrough, type CrmProjectDetail } from '@/domain/crm';
import { MOCK_CRM_PROJECT_DETAILS } from '@/platform/mock/crm';
import {
  loadOrCreateDemoSessionStore,
  serializeDemoSessionStore,
  writeDemoSessionSnapshot,
  clearDemoSessionStorage,
  type DemoSessionStore,
} from '@/infrastructure/demo/demoSessionStore';
import { isDemoRuntimeClient } from '@/infrastructure/runtime/buildCoreRuntime';
import {
  hydrateDemoPipelineStagesFromSession,
  resetDemoPipelineStagesStore,
  getDemoPipelineStageCatalog,
} from '@/infrastructure/demo/demoPipelineStagesStore';
import { resetMockFieldLabelsStore } from './mockFieldLabelsStore';
import { resetMockWorkflowTaskCustomFieldsStore } from './mockWorkflowTaskCustomFieldsStore';
import { resetMockWorkflowTaskTableColumnsStore } from './mockWorkflowTaskTableColumnsStore';
import { resetMockPaymentTableColumnsStore } from './mockPaymentTableColumnsStore';

const projectOverrides = new Map<string, CrmProjectDetail>();
const archivedSlugs = new Set<string>();

let activeDemoSessionId: string | null = null;

export function isMockProjectArchived(slug: string): boolean {
  return archivedSlugs.has(slug);
}

export function archiveMockProjectSlug(slug: string): void {
  const trimmed = slug.trim();
  if (!trimmed) return;
  archivedSlugs.add(trimmed);
  projectOverrides.delete(trimmed);
  persistDemoOverridesIfActive();
}

export function listEffectiveMockProjectSummaries(options?: {
  rootsOnly?: boolean;
}): readonly import('@/domain/crm').CrmProjectSummary[] {
  const rootsOnly = options?.rootsOnly !== false;
  const bySlug = new Map<string, import('@/domain/crm').CrmProjectSummary>();

  for (const seed of MOCK_CRM_PROJECT_DETAILS) {
    if (archivedSlugs.has(seed.summary.slug)) continue;
    const effective = projectOverrides.get(seed.summary.slug) ?? seed;
    bySlug.set(seed.summary.slug, effective.summary);
  }

  for (const [slug, detail] of projectOverrides.entries()) {
    if (archivedSlugs.has(slug)) continue;
    if (!bySlug.has(slug)) {
      bySlug.set(slug, detail.summary);
    }
  }

  return [...bySlug.values()].filter(
    (summary) => !rootsOnly || summary.parentProjectId == null
  );
}

export function getActiveDemoSessionId(): string | null {
  return activeDemoSessionId;
}

export function getDemoProjectOverrides(): ReadonlyMap<string, CrmProjectDetail> {
  return projectOverrides;
}

export function getDemoArchivedSlugs(): ReadonlySet<string> {
  return archivedSlugs;
}

export function getEffectiveMockProjectDetailBySlug(slug: string): CrmProjectDetail | null {
  if (archivedSlugs.has(slug)) return null;
  return projectOverrides.get(slug) ?? getMockCrmProjectDetailBySlug(slug) ?? null;
}

function getMockCrmProjectDetailBySlug(slug: string): CrmProjectDetail | null {
  return MOCK_CRM_PROJECT_DETAILS.find((detail) => detail.summary.slug === slug) ?? null;
}

function getMockCrmProjectDetailById(id: string): CrmProjectDetail | null {
  return MOCK_CRM_PROJECT_DETAILS.find((detail) => detail.summary.id === id) ?? null;
}

export function getEffectiveMockProjectDetailById(id: string): CrmProjectDetail | null {
  for (const detail of projectOverrides.values()) {
    if (detail.summary.id === id) return detail;
  }
  const seeded = getMockCrmProjectDetailById(id);
  if (seeded != null && archivedSlugs.has(seeded.summary.slug)) return null;
  return seeded ?? null;
}

export function saveMockProjectDetail(slug: string, detail: CrmProjectDetail): CrmProjectDetail {
  const normalized = withStageProgress(detail);
  projectOverrides.set(slug, normalized);
  persistDemoOverridesIfActive();
  return normalized;
}

export function hydrateMockCrmStateFromDemoSession(store?: DemoSessionStore): void {
  const session = store ?? loadOrCreateDemoSessionStore();
  activeDemoSessionId = session.sessionId;
  projectOverrides.clear();
  archivedSlugs.clear();
  for (const [slug, detail] of session.projectOverrides.entries()) {
    projectOverrides.set(slug, withStageProgress(detail));
  }
  for (const slug of session.archivedSlugs) {
    archivedSlugs.add(slug);
  }
  hydrateDemoPipelineStagesFromSession(session.pipelineStages);
  if (session.projectOverrides.size === 0 && session.archivedSlugs.length === 0 && session.pipelineStages == null) {
    persistDemoOverridesIfActive();
  }
}

export function resetMockCrmMutationStore(): void {
  projectOverrides.clear();
  archivedSlugs.clear();
  activeDemoSessionId = null;
}

function persistDemoOverridesIfActive(): void {
  if (!isDemoRuntimeClient()) return;
  const sessionId = activeDemoSessionId ?? loadOrCreateDemoSessionStore().sessionId;
  activeDemoSessionId = sessionId;
  writeDemoSessionSnapshot(
    serializeDemoSessionStore(sessionId, projectOverrides, archivedSlugs)
  );
}

function withStageProgress(detail: CrmProjectDetail): CrmProjectDetail {
  const balanced = applyPaymentBalanceToProjectDetail(detail);
  const scope = balanced.summary.parentProjectId != null ? 'subproject' : 'project';
  const catalog = isDemoRuntimeClient() ? getDemoPipelineStageCatalog(scope) : undefined;
  return {
    ...balanced,
    stageProgress: {
      currentStageSlug: balanced.summary.currentStageSlug,
      completedStageSlugs: completedStagesThrough(balanced.summary.currentStageSlug, catalog),
    },
  };
}

export function clearDemoCrmSession(): void {
  clearDemoSessionStorage();
  resetMockCrmMutationStore();
  resetDemoPipelineStagesStore();
  resetDemoOrganizationCustomizationStores();
}

function resetDemoOrganizationCustomizationStores(): void {
  resetMockFieldLabelsStore();
  resetMockWorkflowTaskCustomFieldsStore();
  resetMockWorkflowTaskTableColumnsStore();
  resetMockPaymentTableColumnsStore();
}
