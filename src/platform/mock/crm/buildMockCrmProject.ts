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
import { emptyCrmProjectAddress } from '@/domain/crm/projectAddress';
import type { CrmClient } from '@/domain/crm/client';
import type { CrmContact } from '@/domain/crm/contact';
import type { CrmTeamMemberRef } from '@/domain/crm/teamMember';
import { getMockCrmTeamMember } from './teamMembers';

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
  projectName: string
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
    dueAt: '2026-05-20T17:00:00.000Z',
    completedAt: status === 'done' ? '2026-05-12T16:30:00.000Z' : null,
    completedBy: status === 'done' ? assignee : null,
    sortOrder,
    amountCents: null,
    invoicedAt: null,
    paidAt: null,
  });

  return [
    mk('wf-intake', `Intake call — ${projectName}`, 'done', 1, 'contacted'),
    mk('wf-site', 'Site walk / inspection', stageSlug === 'new-lead' ? 'pending' : 'in_progress', 2, 'inspection-scheduled'),
    mk('wf-estimate', 'Prepare estimate package', 'pending', 3, 'estimate-sent'),
    mk('wf-schedule', 'Confirm crew schedule', 'pending', 4, 'scheduled'),
  ];
}

function defaultPaymentMilestoneTasks(
  assignee: CrmTeamMemberRef,
  dealValueCents: number,
  paidCents: number
): CrmWorkflowTask[] {
  const deposit = Math.round(dealValueCents * 0.3);
  const final = dealValueCents - deposit;
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
      dueAt: '2026-06-01T17:00:00.000Z',
      completedAt,
      completedBy: status === 'done' ? assignee : null,
      sortOrder,
      amountCents,
      invoicedAt:
        status === 'in_progress' || status === 'done' ? '2026-05-01T12:00:00.000Z' : null,
      paidAt: status === 'done' ? completedAt : null,
    };
  };

  return [
    mkPayment(
      'pay-deposit',
      'Milestone 1',
      deposit,
      paidCents >= deposit ? 'done' : 'in_progress',
      101
    ),
    mkPayment(
      'pay-final',
      'Milestone 2',
      final,
      paidCents >= dealValueCents ? 'done' : 'pending',
      102
    ),
  ];
}

function defaultDocuments(
  stageSlug: PipelineStageSlug,
  uploader: CrmTeamMemberRef,
  reviewer: CrmTeamMemberRef
): CrmDocumentMetadata[] {
  return [
    {
      id: 'doc-photos',
      workflowTaskId: 'wf-site',
      budgetEntryId: null,
      name: 'Site photos.zip',
      kind: 'photo',
      stageSlug: 'inspection-complete',
      uploadedAt: '2026-05-08T14:00:00.000Z',
      uploadedBy: uploader,
      reviewedAt: '2026-05-09T09:00:00.000Z',
      reviewedBy: reviewer,
      mimeType: 'application/zip',
      sizeBytes: 4_800_000,
    },
    {
      id: 'doc-estimate',
      workflowTaskId: 'wf-estimate',
      budgetEntryId: null,
      name: 'Estimate_v2.pdf',
      kind: 'estimate',
      stageSlug: 'estimate-sent',
      uploadedAt: '2026-05-10T11:00:00.000Z',
      uploadedBy: uploader,
      reviewedAt: stageSlug === 'waiting-on-approval' ? null : '2026-05-11T10:00:00.000Z',
      reviewedBy: stageSlug === 'waiting-on-approval' ? null : reviewer,
      mimeType: 'application/pdf',
      sizeBytes: 320_000,
    },
  ];
}

function defaultBudgetEntries(assignee: CrmTeamMemberRef): CrmBudgetEntry[] {
  const now = '2026-05-10T14:00:00.000Z';
  return [
    {
      id: 'budget-mock-1',
      itemName: 'Crew labor — week 1',
      category: 'labor',
      costCents: 12_500_00,
      budgetCents: 14_000_00,
      notes: null,
      assignedTo: assignee,
      costIncurredAt: '2026-05-01T12:00:00.000Z',
      documentCount: 0,
      documentsRequired: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'budget-mock-2',
      itemName: 'Roofing materials',
      category: 'materials',
      costCents: 8_200_00,
      budgetCents: 9_000_00,
      notes: null,
      assignedTo: null,
      costIncurredAt: '2026-05-03T12:00:00.000Z',
      documentCount: 0,
      documentsRequired: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'budget-mock-3',
      itemName: 'Equipment rental',
      category: 'equipment',
      costCents: 1_800_00,
      budgetCents: 2_000_00,
      notes: null,
      assignedTo: null,
      costIncurredAt: '2026-05-10T12:00:00.000Z',
      documentCount: 0,
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
  const paidCents = input.paidCents ?? 0;
  const invoicedCents = input.invoicedCents ?? (paidCents > 0 ? input.dealValueCents : 0);

  const opsTasks =
    input.workflowTasks ??
    defaultWorkflowTasks(input.currentStageSlug, assignedTo, input.name);
  const includePaymentMilestones =
    input.currentStageSlug === 'invoiced' || input.currentStageSlug === 'complete';
  const paymentTasks = includePaymentMilestones
    ? defaultPaymentMilestoneTasks(assignedTo, input.dealValueCents, paidCents)
    : [];
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
    address: emptyCrmProjectAddress(),
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
    primaryPhotoPath: input.primaryPhotoPath ?? null,
    leadToken: input.leadToken ?? `00000000-0000-4000-8000-${input.id.replace(/\D/g, '').padStart(12, '0').slice(-12)}`,
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
    documents: [...(input.documents ?? defaultDocuments(input.currentStageSlug, assignedTo, reviewer))],
    accountabilityLog: [
      ...(input.accountabilityLog ?? defaultAccountability(assignedTo, input.currentStageSlug, input.name)),
    ],
    milestonePayment: { ...milestonePayment, balanceCents: balanceRemainingCents },
    budget: buildProjectBudgetSummary(
      [...(input.budgetEntries ?? defaultBudgetEntries(assignedTo))]
    ),
  };
}
