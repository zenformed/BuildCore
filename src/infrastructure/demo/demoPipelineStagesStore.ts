import type { OrgPipelineStageRecord, PipelineStageScope } from '@/domain/buildcore/orgPipelineStages';
import {
  defaultOrgPipelineStageRecords,
  ensureUniquePipelineStageSlug,
  findTerminalPipelineStageRecord,
  isInternalWorkflowStageSlug,
  isReservedPipelineStageSlug,
  orderPipelineStageIdsWithTerminalLast,
  orgPipelineStageRecordsToPipelineStages,
  slugifyPipelineStageLabel,
} from '@/domain/buildcore/orgPipelineStages';
import type { PipelineStage } from '@/domain/crm/pipelineStage';
import {
  getEffectiveMockProjectDetailBySlug,
  listEffectiveMockProjectSummaries,
} from '@/infrastructure/crm/mock/mockCrmMutationStore';
import { DEMO_ORGANIZATION_ID } from '@/infrastructure/demo/demoProfileFixtures';
import {
  getActivePipelineStagesOverride,
  setActivePipelineStagesOverride,
  clearActivePipelineStagesOverride,
  readDemoSessionSnapshot,
  serializeDemoSessionStore,
  writeDemoSessionSnapshot,
  createDemoSessionId,
  type DemoPipelineStagesSnapshot,
} from '@/infrastructure/demo/demoSessionStore';
import type { BuildCorePipelineStagesResponse } from '@/infrastructure/crm/server/pipelineStageService';
import { buildDefaultBuildCorePipelineStagesResponse } from '@/infrastructure/crm/server/pipelineStageService';
import { isDemoRuntimeClient } from '@/infrastructure/runtime/buildCoreRuntime';

function defaultStagesForScope(scope: PipelineStageScope): OrgPipelineStageRecord[] {
  return defaultOrgPipelineStageRecords(DEMO_ORGANIZATION_ID, scope);
}

function getStagesForScope(scope: PipelineStageScope): OrgPipelineStageRecord[] {
  const override = getActivePipelineStagesOverride()?.[scope];
  if (override != null && override.length > 0) {
    return [...override];
  }
  return defaultStagesForScope(scope);
}

function buildScopeResponse(scope: PipelineStageScope): BuildCorePipelineStagesResponse {
  const stages = getStagesForScope(scope);
  return {
    scope,
    stages,
    catalog: orgPipelineStageRecordsToPipelineStages(stages),
    canManage: true,
  };
}

function normalizeSortOrder(stages: OrgPipelineStageRecord[]): OrgPipelineStageRecord[] {
  return stages.map((stage, index) => ({
    ...stage,
    sortOrder: index + 1,
  }));
}

function sortStagesBySortOrder(stages: readonly OrgPipelineStageRecord[]): OrgPipelineStageRecord[] {
  return [...stages].sort((a, b) => a.sortOrder - b.sortOrder);
}

function createStageId(scope: PipelineStageScope, slug: string): string {
  const suffix =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().slice(0, 8)
      : String(Date.now());
  return `demo-stage-${scope}-${slug}-${suffix}`;
}

function findStageById(stageId: string): { stage: OrgPipelineStageRecord; scope: PipelineStageScope } | null {
  for (const scope of ['project', 'subproject'] as const) {
    const stage = getStagesForScope(scope).find((item) => item.id === stageId) ?? null;
    if (stage != null) return { stage, scope };
  }
  return null;
}

function countDemoPipelineStageUsage(slug: string, scope: PipelineStageScope): number {
  let count = 0;
  for (const summary of listEffectiveMockProjectSummaries({ rootsOnly: false })) {
    const isSubproject = summary.parentProjectId != null;
    if (scope === 'project' && isSubproject) continue;
    if (scope === 'subproject' && !isSubproject) continue;

    if (summary.currentStageSlug === slug) {
      count += 1;
    }

    const detail = getEffectiveMockProjectDetailBySlug(summary.slug);
    if (detail == null) continue;
    for (const task of detail.workflowTasks) {
      if (task.stageSlug === slug && task.amountCents == null) {
        count += 1;
      }
    }
  }
  return count;
}

function persistPipelineStagesToSession(): void {
  if (!isDemoRuntimeClient()) return;
  const snapshot = readDemoSessionSnapshot();
  const sessionId = snapshot?.sessionId ?? createDemoSessionId();
  const projectOverrides = new Map(
    snapshot != null ? Object.entries(snapshot.projectOverrides) : []
  );
  const archivedSlugs = new Set(snapshot?.archivedSlugs ?? []);
  const pipelineStages = getActivePipelineStagesOverride();

  writeDemoSessionSnapshot(
    serializeDemoSessionStore(sessionId, projectOverrides, archivedSlugs, pipelineStages)
  );
}

function commitScopeStages(scope: PipelineStageScope, stages: OrgPipelineStageRecord[]): void {
  const normalized = normalizeSortOrder(stages);
  const next: DemoPipelineStagesSnapshot = {
    project: scope === 'project' ? normalized : getStagesForScope('project'),
    subproject: scope === 'subproject' ? normalized : getStagesForScope('subproject'),
  };
  setActivePipelineStagesOverride(next);
  persistPipelineStagesToSession();
}

export function hydrateDemoPipelineStagesFromSession(
  snapshot: DemoPipelineStagesSnapshot | null | undefined
): void {
  setActivePipelineStagesOverride(
    snapshot != null &&
      Array.isArray(snapshot.project) &&
      Array.isArray(snapshot.subproject) &&
      (snapshot.project.length > 0 || snapshot.subproject.length > 0)
      ? {
          project: [...snapshot.project],
          subproject: [...snapshot.subproject],
        }
      : null
  );
}

export function resetDemoPipelineStagesStore(): void {
  clearActivePipelineStagesOverride();
}

export function getDemoPipelineStagesBothScopes(): {
  project: BuildCorePipelineStagesResponse;
  subproject: BuildCorePipelineStagesResponse;
  canManage: boolean;
} {
  return {
    project: buildScopeResponse('project'),
    subproject: buildScopeResponse('subproject'),
    canManage: true,
  };
}

export function getDemoPipelineStageCatalog(scope: PipelineStageScope): readonly PipelineStage[] {
  return buildScopeResponse(scope).catalog;
}

export function createDemoPipelineStage(
  label: string,
  scope: PipelineStageScope
): BuildCorePipelineStagesResponse {
  const trimmedLabel = label.trim();
  if (!trimmedLabel) {
    throw new Error('Stage name is required.');
  }

  const existing = getStagesForScope(scope);
  const terminal = findTerminalPipelineStageRecord(existing);
  const takenSlugs = new Set(existing.map((stage) => stage.slug));
  let slug = ensureUniquePipelineStageSlug(slugifyPipelineStageLabel(trimmedLabel), takenSlugs);
  if (isReservedPipelineStageSlug(slug) || isInternalWorkflowStageSlug(slug)) {
    slug = ensureUniquePipelineStageSlug(`${slug}-stage`, takenSlugs);
  }

  const insertSortOrder =
    terminal?.sortOrder ?? existing.reduce((max, stage) => Math.max(max, stage.sortOrder), 0) + 1;

  const nextStages = existing.map((stage) =>
    terminal != null && stage.id === terminal.id
      ? { ...stage, sortOrder: insertSortOrder + 1 }
      : stage
  );

  nextStages.push({
    id: createStageId(scope, slug),
    organizationId: DEMO_ORGANIZATION_ID,
    stageScope: scope,
    slug,
    label: trimmedLabel,
    sortOrder: insertSortOrder,
    isActive: true,
  });

  commitScopeStages(scope, sortStagesBySortOrder(nextStages));
  return buildScopeResponse(scope);
}

export function renameDemoPipelineStage(
  stageId: string,
  label: string
): BuildCorePipelineStagesResponse {
  const trimmedLabel = label.trim();
  if (!trimmedLabel) {
    throw new Error('Stage name is required.');
  }

  const located = findStageById(stageId);
  if (located == null) {
    throw new Error('Workflow stage not found.');
  }

  const { scope } = located;
  const nextStages = getStagesForScope(scope).map((stage) =>
    stage.id === stageId ? { ...stage, label: trimmedLabel } : stage
  );
  commitScopeStages(scope, nextStages);
  return buildScopeResponse(scope);
}

export function deleteDemoPipelineStage(stageId: string): BuildCorePipelineStagesResponse {
  const located = findStageById(stageId);
  if (located == null) {
    throw new Error('Workflow stage not found.');
  }

  const { stage: target, scope } = located;
  const stages = getStagesForScope(scope);

  if (isReservedPipelineStageSlug(target.slug)) {
    throw new Error('Complete is the terminal workflow stage and cannot be deleted.');
  }
  if (stages.length <= 1) {
    throw new Error('At least one workflow stage must remain.');
  }

  const usageCount = countDemoPipelineStageUsage(target.slug, scope);
  if (usageCount > 0) {
    throw new Error('This stage is still used by projects or tasks and cannot be deleted.');
  }

  const remaining = stages.filter((stage) => stage.id !== stageId);
  const orderedIds = orderPipelineStageIdsWithTerminalLast(
    remaining,
    remaining
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((stage) => stage.id)
  );
  const reordered = orderedIds
    .map((id) => remaining.find((stage) => stage.id === id))
    .filter((stage): stage is OrgPipelineStageRecord => stage != null);

  commitScopeStages(scope, reordered);
  return buildScopeResponse(scope);
}

export function reorderDemoPipelineStages(
  orderedStageIds: readonly string[],
  scope: PipelineStageScope
): BuildCorePipelineStagesResponse {
  const stages = getStagesForScope(scope);
  const existingIds = new Set(stages.map((stage) => stage.id));
  if (orderedStageIds.length !== stages.length) {
    throw new Error('Stage order payload is invalid.');
  }
  for (const stageId of orderedStageIds) {
    if (!existingIds.has(stageId)) {
      throw new Error('Stage order payload is invalid.');
    }
  }

  const normalizedOrder = orderPipelineStageIdsWithTerminalLast(stages, orderedStageIds);
  const reordered = normalizedOrder
    .map((id) => stages.find((stage) => stage.id === id))
    .filter((stage): stage is OrgPipelineStageRecord => stage != null);

  commitScopeStages(scope, reordered);
  return buildScopeResponse(scope);
}

export function getDefaultDemoPipelineStagesBothScopes() {
  return {
    project: buildDefaultBuildCorePipelineStagesResponse('project'),
    subproject: buildDefaultBuildCorePipelineStagesResponse('subproject'),
    canManage: true,
  };
}
