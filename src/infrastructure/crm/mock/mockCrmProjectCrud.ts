import type {
  CreateCrmProjectInput,
  CreateCrmProjectResult,
  CrmAccountabilityAction,
  CrmProjectDetail,
  CrmProjectSummary,
} from '@/domain/crm';
import type { BulkArchiveCrmProjectsResult } from '@/domain/crm/bulkArchiveProjects';
import type { BulkMarkActiveCrmProjectsResult } from '@/domain/crm/bulkMarkActiveProjects';
import type { BulkMarkInactiveCrmProjectsResult } from '@/domain/crm/bulkMarkInactiveProjects';
import type {
  MarkCrmProjectsActiveInput,
  MarkCrmProjectsInactiveInput,
} from '@/domain/crm/subprojectStatus';
import { validateMarkCrmProjectsInactiveInput } from '@/domain/crm/subprojectStatus';
import { DEMO_TEAM_MEMBER_ID } from '@/infrastructure/demo/demoProfileFixtures';
import { slugifyProjectName } from '@/infrastructure/crm/server/crmSlug';
import { MOCK_CRM_PROJECT_DETAILS } from '@/platform/mock/crm';
import { buildMockCrmProjectDetail } from '@/platform/mock/crm/buildMockCrmProject';
import { resolveMockCrmTeamMember } from '@/platform/mock/crm/teamMembers';
import {
  archiveMockProjectSlug,
  getEffectiveMockProjectDetailById,
  getEffectiveMockProjectDetailBySlug,
  listEffectiveMockProjectSummaries,
  saveMockProjectDetail,
} from './mockCrmMutationStore';

function listKnownProjectSlugs(): Set<string> {
  const slugs = new Set<string>();
  for (const seed of MOCK_CRM_PROJECT_DETAILS) {
    slugs.add(seed.summary.slug);
  }
  for (const summary of listEffectiveMockProjectSummaries({ rootsOnly: false })) {
    slugs.add(summary.slug);
  }
  return slugs;
}

function ensureUniqueDemoProjectSlug(name: string): string {
  const baseSlug = slugifyProjectName(name);
  const known = listKnownProjectSlugs();
  if (!known.has(baseSlug)) {
    return baseSlug;
  }
  let suffix = 2;
  while (known.has(`${baseSlug}-${suffix}`)) {
    suffix += 1;
  }
  return `${baseSlug}-${suffix}`;
}

function demoActor(): CrmProjectDetail['accountabilityLog'][number]['actor'] {
  return (
    resolveMockCrmTeamMember(DEMO_TEAM_MEMBER_ID) ?? {
      id: DEMO_TEAM_MEMBER_ID,
      displayName: 'Alex Rivera',
      initials: 'AR',
      avatarUrl: null,
      email: 'alex.rivera@zenformed.test',
    }
  );
}

function appendAccountability(
  detail: CrmProjectDetail,
  action: string,
  stageSlug: CrmProjectDetail['summary']['currentStageSlug']
): CrmAccountabilityAction[] {
  const accountability: CrmAccountabilityAction = {
    id: `acct-demo-${crypto.randomUUID()}`,
    at: new Date().toISOString(),
    actor: demoActor(),
    action,
    stageSlug,
  };
  return [accountability, ...detail.accountabilityLog];
}

export function mockCreateCrmProject(input: CreateCrmProjectInput): CreateCrmProjectResult {
  const parentProjectId = input.parentProjectId?.trim() || null;
  if (parentProjectId != null) {
    const parent = getEffectiveMockProjectDetailById(parentProjectId);
    if (parent == null) {
      throw new Error('Parent project not found.');
    }
  }

  const id = `demo-proj-${crypto.randomUUID()}`;
  const slug = ensureUniqueDemoProjectSlug(input.name);
  const now = new Date().toISOString();
  const assignedToId = input.assignedMemberId ?? DEMO_TEAM_MEMBER_ID;

  const detail = buildMockCrmProjectDetail({
    id,
    slug,
    name: input.name,
    parentProjectId,
    industry: input.industry,
    customIndustry: input.customIndustry,
    contact: {
      id: `contact-${id}`,
      name: input.contactName,
      email: input.email,
      phone: input.phone,
      title: null,
    },
    client: {
      id: `client-${id}`,
      name: input.name,
      segment: null,
    },
    priority: input.priority,
    currentStageSlug: input.currentStageSlug,
    notes: input.notes ?? '',
    dealValueCents: input.dealValueCents,
    paidCents: 0,
    assignedToId,
    lastUpdatedAt: now,
    accountabilityLog: [
      {
        id: `acct-demo-${crypto.randomUUID()}`,
        at: now,
        actor: demoActor(),
        action:
          parentProjectId != null
            ? `Created subproject ${input.name}`
            : `Created project ${input.name}`,
        stageSlug: input.currentStageSlug,
      },
    ],
  });

  const summary: CrmProjectSummary = {
    ...detail.summary,
    balanceRemainingCents: input.balanceRemainingCents,
    address: {
      addressLine1: input.addressLine1,
      addressLine2: input.addressLine2,
      city: input.city,
      state: input.state,
      postalCode: input.postalCode,
    },
  };

  const saved = saveMockProjectDetail(slug, { ...detail, summary });
  return { id: saved.summary.id, slug: saved.summary.slug, summary: saved.summary };
}

export function mockArchiveCrmProject(slug: string): boolean {
  const trimmed = slug.trim();
  if (!trimmed) return false;
  const detail = getEffectiveMockProjectDetailBySlug(trimmed);
  if (detail == null) return false;
  archiveMockProjectSlug(trimmed);
  return true;
}

export function mockBulkArchiveCrmProjects(slugs: readonly string[]): BulkArchiveCrmProjectsResult {
  const deletedSlugs: string[] = [];
  const failedSlugs: string[] = [];

  for (const slug of slugs) {
    if (mockArchiveCrmProject(slug)) {
      deletedSlugs.push(slug);
    } else {
      failedSlugs.push(slug);
    }
  }

  return {
    deletedCount: deletedSlugs.length,
    deletedSlugs,
    failedSlugs,
  };
}

function applyInactiveState(
  slug: string,
  input: MarkCrmProjectsInactiveInput
): CrmProjectSummary | null {
  const detail = getEffectiveMockProjectDetailBySlug(slug);
  if (detail == null) return null;

  const now = new Date().toISOString();
  const actor = demoActor();
  const summary: CrmProjectSummary = {
    ...detail.summary,
    subprojectStatus: 'inactive',
    inactiveReason: input.reason,
    inactiveReasonCustom: input.customReason ?? null,
    inactiveAt: now,
    inactiveBy: actor,
    lastUpdatedAt: now,
  };

  saveMockProjectDetail(slug, {
    ...detail,
    summary,
    accountabilityLog: appendAccountability(
      detail,
      `Marked subproject ${detail.summary.name} inactive`,
      detail.summary.currentStageSlug
    ),
  });
  return summary;
}

function applyActiveState(slug: string): CrmProjectSummary | null {
  const detail = getEffectiveMockProjectDetailBySlug(slug);
  if (detail == null) return null;

  const now = new Date().toISOString();
  const summary: CrmProjectSummary = {
    ...detail.summary,
    subprojectStatus: detail.summary.completedAt != null ? 'completed' : 'normal',
    inactiveReason: null,
    inactiveReasonCustom: null,
    inactiveAt: null,
    inactiveBy: null,
    lastUpdatedAt: now,
  };

  saveMockProjectDetail(slug, {
    ...detail,
    summary,
    accountabilityLog: appendAccountability(
      detail,
      `Marked subproject ${detail.summary.name} active`,
      detail.summary.currentStageSlug
    ),
  });
  return summary;
}

export function mockMarkCrmProjectsInactive(
  input: MarkCrmProjectsInactiveInput
): BulkMarkInactiveCrmProjectsResult {
  const validationMessage = validateMarkCrmProjectsInactiveInput(input);
  if (validationMessage != null) {
    throw new Error(validationMessage);
  }

  const updatedSlugs: string[] = [];
  const failedSlugs: string[] = [];

  for (const slug of input.projectSlugs) {
    if (applyInactiveState(slug, input) != null) {
      updatedSlugs.push(slug);
    } else {
      failedSlugs.push(slug);
    }
  }

  return {
    updatedCount: updatedSlugs.length,
    updatedSlugs,
    failedSlugs,
  };
}

export function mockMarkCrmProjectsActive(
  input: MarkCrmProjectsActiveInput
): BulkMarkActiveCrmProjectsResult {
  const updatedSlugs: string[] = [];
  const failedSlugs: string[] = [];

  for (const slug of input.projectSlugs) {
    if (applyActiveState(slug) != null) {
      updatedSlugs.push(slug);
    } else {
      failedSlugs.push(slug);
    }
  }

  return {
    updatedCount: updatedSlugs.length,
    updatedSlugs,
    failedSlugs,
  };
}
