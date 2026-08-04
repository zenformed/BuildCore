import {
  buildProjectBudgetSummary,
  completedStagesThrough,
  computeProjectBalanceCents,
  PAYMENT_WORKFLOW_STAGE_SLUG,
  type CrmAccountabilityAction,
  type CrmBudgetEntry,
  type CrmDocumentMetadata,
  type CrmMilestonePaymentSummary,
  type CrmPriority,
  type CrmProjectDetail,
  type CrmProjectStageCompletion,
  type CrmProjectSummary,
  type CrmIndustry,
  type CrmWorkflowTask,
  type PipelineStageSlug,
  type WorkflowTaskStatus,
} from '@/domain/crm';
import { deriveCrmSubprojectStatus } from '@/domain/crm/subprojectStatus';
import { emptyCrmProjectAddress, type CrmProjectAddress } from '@/domain/crm/projectAddress';
import type { CrmClient } from '@/domain/crm/client';
import type { CrmContact } from '@/domain/crm/contact';
import type { CrmTeamMemberRef } from '@/domain/crm/teamMember';
import { getMockCrmTeamMember } from './teamMembers';
import { getMockProjectCustomFieldsForProject } from '@/infrastructure/crm/mock/mockProjectCustomFieldsStore';

export type BuildMockCrmProjectInput = {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly parentProjectId?: string | null;
  readonly industry: CrmIndustry
  readonly customIndustry?: string | null;
  readonly contact: CrmContact;
  readonly client: CrmClient;
  readonly priority: CrmPriority;
  readonly currentStageSlug: PipelineStageSlug;
  readonly notes: string;
  readonly dealValueCents: number;
  readonly paidCents?: number;
  readonly invoicedCents?: number;
  readonly assignedToId: string;
  readonly lastUpdatedAt: string;
  readonly completedAt?: string | null;
  readonly completedById?: string | null;
  readonly primaryPhotoPath?: string | null;
  readonly latitude?: number | null;
  readonly longitude?: number | null;
  readonly address?: CrmProjectAddress;
  readonly leadToken?: string;
  readonly workflowTasks?: readonly CrmWorkflowTask[];
  readonly manualStageCompletions?: readonly CrmProjectStageCompletion[];
  readonly documents?: readonly CrmDocumentMetadata[];
  readonly accountabilityLog?: readonly CrmAccountabilityAction[];
  readonly milestonePayment?: CrmMilestonePaymentSummary;
  readonly budgetEntries?: readonly CrmBudgetEntry[];
};

function notesPreview(notes: string, max = 120): string {
  const trimmed = notes.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

const DEFAULT_STAGE_SLUGS: readonly PipelineStageSlug[] = [
  'new-lead',
  'contacted',
  'inspection-scheduled',
  'inspection-complete',
  'estimate-sent',
  'waiting-on-approval',
  'approved',
  'scheduled',
  'in-progress',
  'completed',
  'invoiced',
  'complete',
];

const STATUS_ROTATION: readonly WorkflowTaskStatus[] = [
  'done',
  'in_progress',
  'pending',
  'blocked',
  'request_review',
  'skipped',
  'rejected',
];

type AddressTemplate = {
  readonly city: string;
  readonly state: string;
  readonly postalCode: string;
  readonly street: string;
};

const ADDRESS_TEMPLATES: readonly AddressTemplate[] = [
  { city: 'Austin', state: 'TX', postalCode: '78701', street: 'Congress Ave' },
  { city: 'Dallas', state: 'TX', postalCode: '75201', street: 'Elm St' },
  { city: 'Houston', state: 'TX', postalCode: '77002', street: 'Main St' },
  { city: 'Fort Worth', state: 'TX', postalCode: '76102', street: 'Throckmorton St' },
  { city: 'San Antonio', state: 'TX', postalCode: '78205', street: 'Houston St' },
  { city: 'Plano', state: 'TX', postalCode: '75074', street: '14th St' },
  { city: 'Irving', state: 'TX', postalCode: '75060', street: 'Irving Blvd' },
  { city: 'Arlington', state: 'TX', postalCode: '76010', street: 'Abram St' },
  { city: 'Frisco', state: 'TX', postalCode: '75034', street: 'Main St' },
  { city: 'Round Rock', state: 'TX', postalCode: '78664', street: 'Mays St' },
];

function stableIndex(seed: string, modulo: number): number {
  let hash = 0;
  for (const ch of seed) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return hash % modulo;
}

function projectKey(id: string): string {
  return id.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
}

function defaultPrimaryPhotoPathForProject(input: BuildMockCrmProjectInput): string | null {
  if (input.primaryPhotoPath != null && input.primaryPhotoPath.trim() !== '') {
    return input.primaryPhotoPath;
  }
  // Only auto-map top-level demo projects; subprojects inherit normal behavior.
  if (input.parentProjectId != null) return null;
  const numeric = Number.parseInt(input.id.replace(/\D/g, ''), 10);
  if (!Number.isFinite(numeric) || numeric < 1 || numeric > 20) return null;
  return `/images/demo-projects/demoProject (${numeric}).png`;
}

function defaultAddressForProject(id: string): CrmProjectAddress {
  const idx = stableIndex(id, ADDRESS_TEMPLATES.length);
  const template = ADDRESS_TEMPLATES[idx] ?? ADDRESS_TEMPLATES[0];
  const buildingNumber = 100 + stableIndex(`${id}-addr`, 8800);
  return {
    addressLine1: `${buildingNumber} ${template.street}`,
    addressLine2: `Suite ${100 + stableIndex(`${id}-suite`, 500)}`,
    city: template.city,
    state: template.state,
    postalCode: template.postalCode,
  };
}

function resolvePaidAndInvoicedCents(
  dealValueCents: number,
  currentStageSlug: PipelineStageSlug,
  explicitPaidCents?: number,
  explicitInvoicedCents?: number
): { readonly paidCents: number; readonly invoicedCents: number } {
  const stageIdx = Math.max(0, DEFAULT_STAGE_SLUGS.indexOf(currentStageSlug));
  const defaultPaidRatio =
    stageIdx >= DEFAULT_STAGE_SLUGS.length - 1
      ? 1
      : stageIdx >= 10
        ? 0.9
        : stageIdx >= 8
          ? 0.85
          : stageIdx >= 5
            ? 0.8
            : 0.75;

  const paidCents =
    explicitPaidCents != null
      ? Math.max(0, Math.min(dealValueCents, explicitPaidCents))
      : Math.round(dealValueCents * defaultPaidRatio);

  const defaultInvoiced = Math.max(paidCents, Math.round(dealValueCents * Math.min(1, defaultPaidRatio + 0.15)));
  const invoicedCents =
    explicitInvoicedCents != null
      ? Math.max(paidCents, Math.min(dealValueCents, explicitInvoicedCents))
      : Math.min(dealValueCents, defaultInvoiced);

  return { paidCents, invoicedCents };
}

function defaultMilestones(
  dealValueCents: number,
  paidCents: number,
  invoicedCents: number,
  stageSlug: PipelineStageSlug
): CrmMilestonePaymentSummary {
  const deposit = Math.round(dealValueCents * 0.3);
  const progress = Math.round(dealValueCents * 0.4);
  const final = dealValueCents - deposit - progress;
  const completeStage = stageSlug === 'complete';
  const invoicedStage = stageSlug === 'invoiced' || completeStage;

  return {
    contractValueCents: dealValueCents,
    invoicedCents,
    paidCents,
    balanceCents: Math.max(0, dealValueCents - paidCents),
    milestones: [
      {
        id: 'ms-deposit',
        label: 'Deposit',
        amountCents: deposit,
        dueAt: '2026-04-01T00:00:00.000Z',
        completedAt: paidCents >= deposit ? '2026-04-05T12:00:00.000Z' : null,
        status: paidCents >= deposit ? 'paid' : 'due',
      },
      {
        id: 'ms-progress',
        label: 'Progress payment',
        amountCents: progress,
        dueAt: '2026-05-01T00:00:00.000Z',
        completedAt: paidCents >= deposit + progress ? '2026-05-10T12:00:00.000Z' : null,
        status:
          paidCents >= deposit + progress ? 'paid' : invoicedStage ? 'due' : 'pending',
      },
      {
        id: 'ms-final',
        label: 'Final payment',
        amountCents: final,
        dueAt: '2026-06-01T00:00:00.000Z',
        completedAt: completeStage ? '2026-05-14T12:00:00.000Z' : null,
        status: completeStage ? 'paid' : invoicedStage ? 'due' : 'pending',
      },
    ],
  };
}

function defaultWorkflowTasks(
  stageSlug: PipelineStageSlug,
  assignee: CrmTeamMemberRef,
  projectName: string,
  key: string
): CrmWorkflowTask[] {
  const mk = (
    id: string,
    title: string,
    status: WorkflowTaskStatus,
    sortOrder: number,
    stage: PipelineStageSlug = stageSlug,
    documentsRequired = true
  ): CrmWorkflowTask => ({
    id,
    stageSlug: stage,
    title,
    status,
    documentsRequired,
    notes: null,
    assignedTo: assignee,
    dueAt: `2026-08-${String(Math.min(28, 5 + sortOrder)).padStart(2, '0')}T17:00:00.000Z`,
    completedAt: status === 'done' ? `2026-08-${String(Math.min(28, 2 + sortOrder)).padStart(2, '0')}T16:30:00.000Z` : null,
    completedBy: status === 'done' ? assignee : null,
    sortOrder,
    amountCents: null,
    invoicedAt: null,
    paidAt: null,
    customFields: {},
  });

  const currentIndex = Math.max(0, DEFAULT_STAGE_SLUGS.indexOf(stageSlug));
  return DEFAULT_STAGE_SLUGS.map((slug, index) => {
    let status: WorkflowTaskStatus;
    if (index < currentIndex - 1) {
      status = index % 2 === 0 ? 'done' : 'skipped';
    } else if (index === currentIndex - 1) {
      status = 'request_review';
    } else if (index === currentIndex) {
      status = 'in_progress';
    } else {
      status = STATUS_ROTATION[(index + currentIndex) % STATUS_ROTATION.length] ?? 'pending';
    }
    const title = `${slug.replace(/-/g, ' ')} checklist — ${projectName}`;
    return mk(`wf-${key}-${slug}`, title, status, index + 1, slug, index % 3 !== 0);
  });
}

function defaultPaymentMilestoneTasks(
  assignee: CrmTeamMemberRef,
  dealValueCents: number,
  paidCents: number,
  key: string
): CrmWorkflowTask[] {
  const deposit = Math.round(dealValueCents * 0.3);
  const progress = Math.round(dealValueCents * 0.4);
  const final = dealValueCents - deposit - progress;
  const mkPayment = (
    id: string,
    title: string,
    amountCents: number,
    status: WorkflowTaskStatus,
    sortOrder: number
  ): CrmWorkflowTask => {
    const completedAt = status === 'done' ? '2026-05-12T16:30:00.000Z' : null;
    return {
      id,
      stageSlug: PAYMENT_WORKFLOW_STAGE_SLUG,
      title,
      status,
      documentsRequired: true,
      notes: null,
      assignedTo: assignee,
      dueAt: `2026-08-${String(Math.min(28, 16 + sortOrder)).padStart(2, '0')}T17:00:00.000Z`,
      completedAt,
      completedBy: status === 'done' ? assignee : null,
      sortOrder,
      amountCents,
      invoicedAt:
        status === 'in_progress' || status === 'done' ? '2026-08-04T12:00:00.000Z' : null,
      paidAt: status === 'done' ? completedAt : null,
      customFields: {},
    };
  };

  return [
    mkPayment(
      `pay-${key}-deposit`,
      'Milestone 1',
      deposit,
      paidCents >= deposit ? 'done' : 'in_progress',
      101
    ),
    mkPayment(
      `pay-${key}-progress`,
      'Milestone 2',
      progress,
      paidCents >= deposit + progress ? 'done' : 'in_progress',
      102
    ),
    mkPayment(
      `pay-${key}-final`,
      'Milestone 3',
      final,
      paidCents >= dealValueCents ? 'done' : 'pending',
      103
    ),
  ];
}

function defaultDocuments(
  stageSlug: PipelineStageSlug,
  uploader: CrmTeamMemberRef,
  reviewer: CrmTeamMemberRef,
  key: string
): CrmDocumentMetadata[] {
  return [
    {
      id: `doc-${key}-photos`,
      workflowTaskId: `wf-${key}-inspection-complete`,
      budgetEntryId: null,
      name: 'Site photos set',
      kind: 'photo',
      stageSlug: 'inspection-complete',
      uploadedAt: '2026-08-06T14:00:00.000Z',
      uploadedBy: uploader,
      reviewedAt: '2026-08-07T09:00:00.000Z',
      reviewedBy: reviewer,
      mimeType: 'image/jpeg',
      sizeBytes: 1_280_000,
    latitude: null,
    longitude: null,
    locationAccuracyMeters: null,
    locationSource: null,
    locationCapturedAt: null,
    },
    {
      id: `doc-${key}-estimate`,
      workflowTaskId: `wf-${key}-estimate-sent`,
      budgetEntryId: null,
      name: 'Estimate_v2.pdf',
      kind: 'estimate',
      stageSlug: 'estimate-sent',
      uploadedAt: '2026-08-09T11:00:00.000Z',
      uploadedBy: uploader,
      reviewedAt: stageSlug === 'waiting-on-approval' ? null : '2026-08-10T10:00:00.000Z',
      reviewedBy: stageSlug === 'waiting-on-approval' ? null : reviewer,
      mimeType: 'application/pdf',
      sizeBytes: 320_000,
    latitude: null,
    longitude: null,
    locationAccuracyMeters: null,
    locationSource: null,
    locationCapturedAt: null,
    },
    {
      id: `doc-${key}-invoice`,
      workflowTaskId: `wf-${key}-invoiced`,
      budgetEntryId: `budget-${key}-materials`,
      name: 'Invoice_packet.pdf',
      kind: 'invoice',
      stageSlug: 'invoiced',
      uploadedAt: '2026-08-12T11:00:00.000Z',
      uploadedBy: uploader,
      reviewedAt: '2026-08-13T10:00:00.000Z',
      reviewedBy: reviewer,
      mimeType: 'application/pdf',
      sizeBytes: 410_000,
      latitude: null,
      longitude: null,
      locationAccuracyMeters: null,
      locationSource: null,
      locationCapturedAt: null,
    },
  ];
}

function defaultBudgetEntries(
  assignee: CrmTeamMemberRef,
  dealValueCents: number,
  key: string
): CrmBudgetEntry[] {
  const now = '2026-08-10T14:00:00.000Z';
  const laborCostCents = Math.max(8_000, Math.round(dealValueCents * 0.18));
  const materialsCostCents = Math.max(6_000, Math.round(dealValueCents * 0.12));
  const equipmentCostCents = Math.max(4_000, Math.round(dealValueCents * 0.08));
  return [
    {
      id: `budget-${key}-labor`,
      itemName: 'Crew labor — week 1',
      category: 'labor',
      costCents: laborCostCents,
      budgetCents: Math.round(laborCostCents * 1.12),
      notes: null,
      assignedTo: assignee,
      costIncurredAt: '2026-08-05T12:00:00.000Z',
      documentCount: 1,
      documentsRequired: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: `budget-${key}-materials`,
      itemName: 'Materials package',
      category: 'materials',
      costCents: materialsCostCents,
      budgetCents: Math.round(materialsCostCents * 1.15),
      notes: null,
      assignedTo: null,
      costIncurredAt: '2026-08-08T12:00:00.000Z',
      documentCount: 1,
      documentsRequired: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: `budget-${key}-equipment`,
      itemName: 'Equipment rental',
      category: 'equipment',
      costCents: equipmentCostCents,
      budgetCents: Math.round(equipmentCostCents * 1.1),
      notes: null,
      assignedTo: null,
      costIncurredAt: '2026-08-12T12:00:00.000Z',
      documentCount: 1,
      documentsRequired: true,
      createdAt: now,
      updatedAt: now,
    },
  ];
}

function defaultAccountability(
  actor: CrmTeamMemberRef,
  stageSlug: PipelineStageSlug,
  projectName: string
): CrmAccountabilityAction[] {
  return [
    {
      id: 'acct-1',
      at: '2026-05-01T15:00:00.000Z',
      actor,
      action: `Lead created for ${projectName}`,
      stageSlug: 'new-lead',
    },
    {
      id: 'acct-2',
      at: '2026-05-06T10:30:00.000Z',
      actor,
      action: 'Customer contacted — left voicemail and sent SMS follow-up',
      stageSlug: 'contacted',
    },
    {
      id: 'acct-3',
      at: '2026-05-12T09:15:00.000Z',
      actor: getMockCrmTeamMember('tm-jordan'),
      action: 'Moved to current pipeline stage',
      stageSlug,
    },
  ];
}

export function buildMockCrmProjectDetail(input: BuildMockCrmProjectInput): CrmProjectDetail {
  const assignedTo = getMockCrmTeamMember(input.assignedToId);
  const reviewer = getMockCrmTeamMember('tm-jordan');
  const key = projectKey(input.id);
  const { paidCents, invoicedCents } = resolvePaidAndInvoicedCents(
    input.dealValueCents,
    input.currentStageSlug,
    input.paidCents,
    input.invoicedCents
  );

  const opsTasks =
    input.workflowTasks ??
    defaultWorkflowTasks(input.currentStageSlug, assignedTo, input.name, key);
  const paymentTasks = defaultPaymentMilestoneTasks(
    assignedTo,
    input.dealValueCents,
    paidCents,
    key
  );
  const workflowTasks = [...opsTasks, ...paymentTasks];
  const balanceRemainingCents = computeProjectBalanceCents(workflowTasks, input.dealValueCents);

  const summary: CrmProjectSummary = {
    id: input.id,
    slug: input.slug,
    parentProjectId: input.parentProjectId ?? null,
    name: input.name,
    industry: input.industry,
    customIndustry: input.customIndustry ?? null,
    contact: input.contact,
    client: input.client,
    address: input.address ?? defaultAddressForProject(input.id) ?? emptyCrmProjectAddress(),
    priority: input.priority,
    currentStageSlug: input.currentStageSlug,
    notesPreview: notesPreview(input.notes),
    dealValueCents: input.dealValueCents,
    balanceRemainingCents,
    assignedTo,
    lastUpdatedAt: input.lastUpdatedAt,
    completedAt: input.completedAt ?? null,
    completedBy:
      input.completedAt != null && input.completedById != null
        ? getMockCrmTeamMember(input.completedById)
        : null,
    primaryPhotoPath: defaultPrimaryPhotoPathForProject(input),
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    leadToken: input.leadToken ?? `00000000-0000-4000-8000-${input.id.replace(/\D/g, '').padStart(12, '0').slice(-12)}`,
    subprojectStatus: deriveCrmSubprojectStatus({
      priority: input.priority,
      completedAt: input.completedAt ?? null,
    }),
    inactiveReason: null,
    inactiveReasonCustom: null,
    inactiveAt: null,
    inactiveBy: null,
    customFields: getMockProjectCustomFieldsForProject(input.id, input.parentProjectId ?? null),
  };

  const milestonePayment =
    input.milestonePayment ??
    defaultMilestones(input.dealValueCents, paidCents, invoicedCents, input.currentStageSlug);

  return {
    summary,
    notes: input.notes,
    stageProgress: {
      currentStageSlug: input.currentStageSlug,
      completedStageSlugs: completedStagesThrough(input.currentStageSlug),
    },
    workflowTasks,
    manualStageCompletions: input.manualStageCompletions ?? [],
    documents: [...(input.documents ?? defaultDocuments(input.currentStageSlug, assignedTo, reviewer, key))],
    accountabilityLog: [
      ...(input.accountabilityLog ?? defaultAccountability(assignedTo, input.currentStageSlug, input.name)),
    ],
    milestonePayment: { ...milestonePayment, balanceCents: balanceRemainingCents },
    budget: buildProjectBudgetSummary(
      [...(input.budgetEntries ?? defaultBudgetEntries(assignedTo, input.dealValueCents, key))]
    ),
  };
}
