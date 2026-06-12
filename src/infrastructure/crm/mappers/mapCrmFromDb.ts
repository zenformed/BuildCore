import {
  buildProjectBudgetSummary,
  completedStagesThrough,
  computeProjectBalanceCents,
  isCrmBudgetCategory,
  type CrmAccountabilityAction,
  type CrmBudgetEntry,
  type CrmClient,
  type CrmContact,
  type CrmDocumentKind,
  type CrmDocumentMetadata,
  type CrmMilestone,
  type CrmMilestonePaymentSummary,
  type CrmMilestoneStatus,
  type CrmPriority,
  type CrmProjectDetail,
  type CrmProjectStageCompletion,
  type CrmProjectSummary,
  type CrmTeamMemberRef,
  type CrmIndustry,
  type CrmWorkflowTask,
  type PipelineStage,
  type PipelineStageSlug,
  type WorkflowTaskStatus,
} from '@/domain/crm';
import { asCrmIndustry } from '@/domain/crm/industry';
import {
  displayNameFromProfileParts,
  initialsFromPersonName,
} from '@/domain/crm/teamMemberDisplay';
import { workflowTaskAssigneeIdFromContactId } from '@/domain/crm/workflowTaskAssignee';
import { isWorkflowTaskStatus } from '@/domain/crm/workflowTaskStatuses';
import type { CrmProjectAddress } from '@/domain/crm/projectAddress';

export type DbCrmClientRow = {
  id: string;
  company_name: string;
};

export type DbCrmContactRow = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  role_title: string | null;
};

export type DbCrmProjectRow = {
  id: string;
  slug: string;
  name: string;
  parent_project_id?: string | null;
  industry?: string;
  custom_industry?: string | null;
  trade_type?: string;
  priority: string;
  current_stage_slug: string;
  notes: string | null;
  deal_value_cents: number;
  balance_cents: number;
  assigned_member_id: string | null;
  last_activity_at: string;
  completed_at: string | null;
  completed_by: string | null;
  primary_photo_path?: string | null;
  address_line_1: string | null;
  address_line_2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  client_id: string;
  primary_contact_id: string | null;
  crm_clients: DbCrmClientRow | DbCrmClientRow[] | null;
  crm_contacts: DbCrmContactRow | DbCrmContactRow[] | null;
};

export type DbCrmWorkflowTaskRow = {
  id: string;
  project_id: string;
  title: string;
  stage_slug: string;
  status: string;
  notes: string | null;
  due_at: string | null;
  completed_at: string | null;
  assigned_member_id: string | null;
  assigned_contact_id: string | null;
  completed_by_member_id: string | null;
  sort_order: number;
  documents_required: boolean;
  amount_cents: number | null;
  invoiced_at: string | null;
  paid_at: string | null;
};

export type DbCrmDocumentRow = {
  id: string;
  project_id: string;
  workflow_task_id: string | null;
  budget_entry_id?: string | null;
  document_type: string;
  file_name: string;
  safe_file_name?: string | null;
  mime_type: string;
  file_size_bytes: number;
  upload_status: string;
  storage_path?: string | null;
  storage_provider?: string | null;
  storage_bucket?: string | null;
  storage_key?: string | null;
  uploaded_by_member_id: string;
  reviewed_by_member_id: string | null;
  reviewed_at: string | null;
  created_at: string;
  deleted_at?: string | null;
};

export type DbCrmMilestoneRow = {
  id: string;
  label: string;
  amount_cents: number;
  due_at: string | null;
  paid_at: string | null;
  status: string;
};

export type DbCrmAccountabilityRow = {
  id: string;
  event_type: string;
  summary: string;
  created_at: string;
  actor_member_id: string;
  workflow_task_id: string | null;
};

export type DbCrmBudgetEntryRow = {
  id: string;
  project_id: string;
  item_name: string;
  category: string;
  cost_cents: number;
  budget_cents: number;
  notes: string | null;
  assigned_to: string | null;
  created_by?: string | null;
  cost_incurred_at: string;
  documents_required?: boolean | null;
  created_at: string;
  updated_at: string;
};

export type DbCrmProjectStageCompletionRow = {
  id: string;
  organization_id: string;
  project_id: string;
  stage_slug: string;
  completed_at: string;
  completed_by: string | null;
  source: string;
};

export type DbProfileRow = {
  id: string;
  email: string | null;
  first_name?: string | null;
  last_name?: string | null;
};

const PRIORITIES: readonly CrmPriority[] = ['low', 'normal', 'high', 'urgent'];

function unwrapJoin<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function asPipelineStageSlug(slug: string): PipelineStageSlug {
  return slug as PipelineStageSlug;
}

function asPriority(value: string): CrmPriority {
  if ((PRIORITIES as readonly string[]).includes(value)) {
    return value as CrmPriority;
  }
  return 'normal';
}

function asWorkflowStatus(value: string): WorkflowTaskStatus {
  if (isWorkflowTaskStatus(value)) {
    return value;
  }
  return 'pending';
}

function asDocumentKind(value: string): CrmDocumentKind {
  const allowed: CrmDocumentKind[] = [
    'estimate',
    'contract',
    'photo',
    'video',
    'invoice',
    'permit',
    'inspection_report',
    'other',
  ];
  if ((allowed as readonly string[]).includes(value)) {
    return value as CrmDocumentKind;
  }
  return 'other';
}

function asMilestoneStatus(value: string): CrmMilestoneStatus {
  const allowed: CrmMilestoneStatus[] = ['pending', 'due', 'paid', 'waived'];
  if ((allowed as readonly string[]).includes(value)) {
    return value as CrmMilestoneStatus;
  }
  return 'pending';
}

function notesPreview(notes: string | null, max = 120): string | null {
  if (notes == null) return null;
  const trimmed = notes.trim();
  if (!trimmed) return null;
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

export function mapProfileToTeamMemberRef(
  profile: DbProfileRow | null | undefined,
  userId: string,
  avatarUrl: string | null = null
): CrmTeamMemberRef {
  const displayName = displayNameFromProfileParts({
    email: profile?.email,
    firstName: profile?.first_name,
    lastName: profile?.last_name,
    userId,
  });
  return {
    id: userId,
    displayName,
    initials: initialsFromPersonName(displayName),
    avatarUrl,
    email: profile?.email ?? null,
  };
}

export function mapDbClient(row: DbCrmClientRow | null, projectId: string): CrmClient {
  if (row == null) {
    return { id: `unknown-client-${projectId}`, name: 'Unknown client', segment: null };
  }
  return {
    id: row.id,
    name: row.company_name,
    segment: null,
  };
}

export function mapDbContact(
  row: DbCrmContactRow | null,
  projectId: string,
  clientName: string
): CrmContact {
  if (row == null) {
    return {
      id: `no-contact-${projectId}`,
      name: clientName,
      email: '',
      phone: '',
      title: null,
    };
  }
  return {
    id: row.id,
    name: row.full_name,
    email: row.email ?? '',
    phone: row.phone ?? '',
    title: row.role_title,
  };
}

function mapDbProjectIndustryFields(
  row: DbCrmProjectRow
): Pick<CrmProjectSummary, 'industry' | 'customIndustry'> {
  if (row.industry != null) {
    return {
      industry: asCrmIndustry(row.industry),
      customIndustry: row.custom_industry ?? null,
    };
  }

  const legacyTradeType = row.trade_type ?? 'general-contractor';
  if (legacyTradeType === 'make-ready') {
    return { industry: 'other', customIndustry: 'Make Ready' };
  }

  return {
    industry: asCrmIndustry(legacyTradeType),
    customIndustry: null,
  };
}

export function mapDbProjectAddress(row: DbCrmProjectRow): CrmProjectAddress {
  return {
    addressLine1: row.address_line_1,
    addressLine2: row.address_line_2,
    city: row.city,
    state: row.state,
    postalCode: row.postal_code,
  };
}

export function mapDbProjectSummary(
  row: DbCrmProjectRow,
  memberById: ReadonlyMap<string, CrmTeamMemberRef>
): CrmProjectSummary {
  const clientRow = unwrapJoin(row.crm_clients);
  const contactRow = unwrapJoin(row.crm_contacts);
  const client = mapDbClient(clientRow, row.id);
  const contact = mapDbContact(contactRow, row.id, client.name);
  const assignedTo =
    row.assigned_member_id != null
      ? (memberById.get(row.assigned_member_id) ??
        mapProfileToTeamMemberRef(null, row.assigned_member_id))
      : null;
  const completedBy =
    row.completed_by != null
      ? (memberById.get(row.completed_by) ?? mapProfileToTeamMemberRef(null, row.completed_by))
      : null;

  return {
    id: row.id,
    slug: row.slug,
    parentProjectId: row.parent_project_id ?? null,
    name: row.name,
    ...mapDbProjectIndustryFields(row),
    contact,
    client,
    address: mapDbProjectAddress(row),
    priority: asPriority(row.priority),
    currentStageSlug: asPipelineStageSlug(row.current_stage_slug),
    notesPreview: notesPreview(row.notes),
    dealValueCents: Number(row.deal_value_cents),
    balanceRemainingCents: Number(row.balance_cents),
    assignedTo,
    lastUpdatedAt: row.last_activity_at,
    completedAt: row.completed_at,
    completedBy,
    primaryPhotoPath: row.primary_photo_path ?? null,
  };
}

function mapContactToAssigneeRef(contact: CrmContact): CrmTeamMemberRef {
  const name = contact.name.trim() || 'Customer';
  return {
    id: workflowTaskAssigneeIdFromContactId(contact.id),
    displayName: `${name} (Customer)`,
    initials: initialsFromPersonName(name),
    avatarUrl: null,
    email: contact.email.trim() || null,
  };
}

export function mapDbWorkflowTask(
  row: DbCrmWorkflowTaskRow,
  memberById: ReadonlyMap<string, CrmTeamMemberRef>,
  contactById: ReadonlyMap<string, CrmContact> = new Map()
): CrmWorkflowTask {
  const assignedTo =
    row.assigned_contact_id != null
      ? (contactById.get(row.assigned_contact_id) != null
          ? mapContactToAssigneeRef(contactById.get(row.assigned_contact_id)!)
          : null)
      : row.assigned_member_id != null
        ? (memberById.get(row.assigned_member_id) ??
          mapProfileToTeamMemberRef(null, row.assigned_member_id))
        : null;

  return {
    id: row.id,
    stageSlug: asPipelineStageSlug(row.stage_slug),
    title: row.title,
    status: asWorkflowStatus(row.status),
    documentsRequired: row.documents_required ?? true,
    notes: row.notes,
    assignedTo,
    dueAt: row.due_at,
    completedAt: row.completed_at,
    completedBy:
      row.completed_by_member_id != null
        ? (memberById.get(row.completed_by_member_id) ??
          mapProfileToTeamMemberRef(null, row.completed_by_member_id))
        : null,
    sortOrder: row.sort_order,
    amountCents: row.amount_cents != null ? Number(row.amount_cents) : null,
    invoicedAt: row.invoiced_at ?? null,
    paidAt: row.paid_at ?? null,
  };
}

export function mapDbDocument(
  row: DbCrmDocumentRow,
  stageSlugByTaskId: ReadonlyMap<string, PipelineStageSlug>,
  memberById: ReadonlyMap<string, CrmTeamMemberRef>
): CrmDocumentMetadata {
  return {
    id: row.id,
    workflowTaskId: row.workflow_task_id,
    budgetEntryId: row.budget_entry_id ?? null,
    name: row.file_name,
    kind: asDocumentKind(row.document_type),
    stageSlug:
      row.workflow_task_id != null
        ? (stageSlugByTaskId.get(row.workflow_task_id) ?? null)
        : null,
    uploadedAt: row.created_at,
    uploadedBy:
      memberById.get(row.uploaded_by_member_id) ??
      mapProfileToTeamMemberRef(null, row.uploaded_by_member_id),
    reviewedAt: row.reviewed_at,
    reviewedBy:
      row.reviewed_by_member_id != null
        ? (memberById.get(row.reviewed_by_member_id) ??
          mapProfileToTeamMemberRef(null, row.reviewed_by_member_id))
        : null,
    mimeType: row.mime_type,
    sizeBytes: Number(row.file_size_bytes),
  };
}

export function mapDbMilestone(row: DbCrmMilestoneRow): CrmMilestone {
  return {
    id: row.id,
    label: row.label,
    amountCents: Number(row.amount_cents),
    dueAt: row.due_at,
    completedAt: row.paid_at,
    status: asMilestoneStatus(row.status),
  };
}

export function buildMilestonePaymentSummary(
  project: DbCrmProjectRow,
  milestones: readonly DbCrmMilestoneRow[]
): CrmMilestonePaymentSummary {
  const contractValueCents = Number(project.deal_value_cents);
  const paidCents = milestones
    .filter((m) => m.status === 'paid')
    .reduce((sum, m) => sum + Number(m.amount_cents), 0);
  const invoicedCents = milestones
    .filter((m) => m.status === 'paid' || m.status === 'due')
    .reduce((sum, m) => sum + Number(m.amount_cents), 0);

  return {
    contractValueCents,
    invoicedCents,
    paidCents,
    balanceCents: Number(project.balance_cents),
    milestones: milestones.map(mapDbMilestone),
  };
}

export function mapDbBudgetEntry(
  row: DbCrmBudgetEntryRow,
  memberById: ReadonlyMap<string, CrmTeamMemberRef>,
  documentCount = 0
): CrmBudgetEntry {
  if (!isCrmBudgetCategory(row.category)) {
    throw new Error(`Invalid budget category: ${row.category}`);
  }
  return {
    id: row.id,
    itemName: row.item_name,
    category: row.category,
    costCents: Number(row.cost_cents),
    budgetCents: Number(row.budget_cents),
    notes: row.notes,
    assignedTo:
      row.assigned_to != null
        ? (memberById.get(row.assigned_to) ?? mapProfileToTeamMemberRef(null, row.assigned_to))
        : null,
    costIncurredAt: row.cost_incurred_at,
    documentCount,
    documentsRequired: row.documents_required ?? true,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapDbAccountability(
  row: DbCrmAccountabilityRow,
  stageSlugByTaskId: ReadonlyMap<string, PipelineStageSlug>,
  memberById: ReadonlyMap<string, CrmTeamMemberRef>
): CrmAccountabilityAction {
  return {
    id: row.id,
    at: row.created_at,
    actor:
      memberById.get(row.actor_member_id) ??
      mapProfileToTeamMemberRef(null, row.actor_member_id),
    action: row.summary,
    stageSlug:
      row.workflow_task_id != null
        ? (stageSlugByTaskId.get(row.workflow_task_id) ?? null)
        : null,
  };
}

export function mapDbProjectStageCompletion(
  row: DbCrmProjectStageCompletionRow,
  memberById: ReadonlyMap<string, CrmTeamMemberRef>
): CrmProjectStageCompletion {
  return {
    stageSlug: asPipelineStageSlug(row.stage_slug),
    completedAt: row.completed_at,
    completedBy:
      row.completed_by != null ? (memberById.get(row.completed_by) ?? null) : null,
    source: row.source === 'manual' ? 'manual' : 'manual',
  };
}

export function mapDbProjectDetail(input: {
  project: DbCrmProjectRow;
  workflowTasks: readonly DbCrmWorkflowTaskRow[];
  manualStageCompletions?: readonly DbCrmProjectStageCompletionRow[];
  documents: readonly DbCrmDocumentRow[];
  milestones: readonly DbCrmMilestoneRow[];
  accountability: readonly DbCrmAccountabilityRow[];
  budgetEntries: readonly DbCrmBudgetEntryRow[];
  memberById: ReadonlyMap<string, CrmTeamMemberRef>;
  pipelineStages?: readonly PipelineStage[];
}): CrmProjectDetail {
  const baseSummary = mapDbProjectSummary(input.project, input.memberById);
  const contactById = new Map<string, CrmContact>([[baseSummary.contact.id, baseSummary.contact]]);
  const workflowTasks = input.workflowTasks.map((row) =>
    mapDbWorkflowTask(row, input.memberById, contactById)
  );
  const balanceRemainingCents = computeProjectBalanceCents(
    workflowTasks,
    baseSummary.dealValueCents
  );
  const summary =
    balanceRemainingCents === baseSummary.balanceRemainingCents
      ? baseSummary
      : { ...baseSummary, balanceRemainingCents };
  const stageSlugByTaskId = new Map(
    input.workflowTasks.map((t) => [t.id, asPipelineStageSlug(t.stage_slug)] as const)
  );
  const milestonePayment = buildMilestonePaymentSummary(input.project, input.milestones);
  const milestonePaymentWithBalance =
    balanceRemainingCents === milestonePayment.balanceCents
      ? milestonePayment
      : { ...milestonePayment, balanceCents: balanceRemainingCents };

  const docCountByBudgetEntry = new Map<string, number>();
  for (const doc of input.documents) {
    if (doc.budget_entry_id) {
      docCountByBudgetEntry.set(
        doc.budget_entry_id,
        (docCountByBudgetEntry.get(doc.budget_entry_id) ?? 0) + 1
      );
    }
  }

  return {
    summary,
    notes: input.project.notes,
    stageProgress: {
      currentStageSlug: summary.currentStageSlug,
      completedStageSlugs: completedStagesThrough(summary.currentStageSlug, input.pipelineStages),
    },
    workflowTasks,
    manualStageCompletions: (input.manualStageCompletions ?? []).map((row) =>
      mapDbProjectStageCompletion(row, input.memberById)
    ),
    documents: input.documents.map((row) =>
      mapDbDocument(row, stageSlugByTaskId, input.memberById)
    ),
    accountabilityLog: input.accountability.map((row) =>
      mapDbAccountability(row, stageSlugByTaskId, input.memberById)
    ),
    milestonePayment: milestonePaymentWithBalance,
    budget: buildProjectBudgetSummary(
      input.budgetEntries.map((row) =>
        mapDbBudgetEntry(row, input.memberById, docCountByBudgetEntry.get(row.id) ?? 0)
      )
    ),
  };
}
