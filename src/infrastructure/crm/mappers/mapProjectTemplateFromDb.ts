import type {
  BuildCoreProjectTemplate,
  BuildCoreProjectTemplatePaymentBlueprint,
  BuildCoreProjectTemplateWorkflowTaskBlueprint,
} from '@/domain/crm/projectTemplate';
import type { PipelineStageSlug } from '@/domain/crm/pipelineStage';

export type DbBuildCoreProjectTemplateRow = {
  id: string;
  organization_id: string;
  name: string;
  workflow_tasks_payload: unknown;
  payments_payload: unknown;
  is_default: boolean;
  created_by_user_id: string | null;
  created_at: string;
  updated_at: string;
};

export function parseProjectTemplateBlueprintsFromUnknown(raw: {
  readonly workflowTasksPayload?: unknown;
  readonly paymentsPayload?: unknown;
  readonly workflow_tasks_payload?: unknown;
  readonly payments_payload?: unknown;
}): {
  workflowTasksPayload: readonly BuildCoreProjectTemplateWorkflowTaskBlueprint[];
  paymentsPayload: readonly BuildCoreProjectTemplatePaymentBlueprint[];
} {
  const workflowRaw = raw.workflowTasksPayload ?? raw.workflow_tasks_payload;
  const paymentsRaw = raw.paymentsPayload ?? raw.payments_payload;
  return {
    workflowTasksPayload: parseBlueprintArray(workflowRaw, parseWorkflowTaskBlueprint),
    paymentsPayload: parseBlueprintArray(paymentsRaw, parsePaymentBlueprint),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function parseWorkflowTaskBlueprint(raw: unknown): BuildCoreProjectTemplateWorkflowTaskBlueprint | null {
  if (!isRecord(raw)) return null;
  const stageKey = raw.stageKey;
  const taskName = raw.taskName;
  if (typeof stageKey !== 'string' || typeof taskName !== 'string') {
    return null;
  }
  const trimmedName = taskName.trim();
  if (trimmedName.length === 0) return null;
  return {
    stageKey: stageKey as PipelineStageSlug,
    taskName: trimmedName,
    documentsRequired: Boolean(raw.documentsRequired),
  };
}

function parsePaymentBlueprint(raw: unknown): BuildCoreProjectTemplatePaymentBlueprint | null {
  if (!isRecord(raw)) return null;
  const title = raw.title;
  const amount = raw.amount;
  if (typeof title !== 'string' || typeof amount !== 'number') {
    return null;
  }
  if (!Number.isFinite(amount) || amount < 0) return null;
  const trimmedTitle = title.trim();
  if (trimmedTitle.length === 0) return null;
  return {
    title: trimmedTitle,
    amount,
    documentsRequired: Boolean(raw.documentsRequired),
  };
}

function parseBlueprintArray<T>(
  raw: unknown,
  parseItem: (item: unknown) => T | null
): readonly T[] {
  if (!Array.isArray(raw)) return [];
  const items: T[] = [];
  for (const entry of raw) {
    const parsed = parseItem(entry);
    if (parsed != null) items.push(parsed);
  }
  return items;
}

export function mapDbBuildCoreProjectTemplate(
  row: DbBuildCoreProjectTemplateRow
): BuildCoreProjectTemplate {
  return {
    id: row.id,
    organizationId: row.organization_id,
    name: row.name.trim(),
    workflowTasksPayload: parseBlueprintArray(
      row.workflow_tasks_payload,
      parseWorkflowTaskBlueprint
    ),
    paymentsPayload: parseBlueprintArray(row.payments_payload, parsePaymentBlueprint),
    isDefault: Boolean(row.is_default),
    createdByUserId: row.created_by_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function serializeProjectTemplateBlueprintsForDb(blueprints: {
  readonly workflowTasksPayload: readonly BuildCoreProjectTemplateWorkflowTaskBlueprint[];
  readonly paymentsPayload: readonly BuildCoreProjectTemplatePaymentBlueprint[];
}): {
  workflow_tasks_payload: unknown;
  payments_payload: unknown;
} {
  return {
    workflow_tasks_payload: blueprints.workflowTasksPayload,
    payments_payload: blueprints.paymentsPayload,
  };
}
