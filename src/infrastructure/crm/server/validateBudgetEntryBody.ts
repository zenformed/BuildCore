import { isCrmBudgetCategory, type CrmBudgetCategory } from '@/domain/crm';

export type BudgetEntryBody = {
  itemName?: string;
  category?: string;
  costCents?: number;
  budgetCents?: number;
  notes?: string | null;
  assignedMemberId?: string | null;
  occurredOn?: string | null;
  documentsRequired?: boolean;
};

type ValidatedCreate = {
  itemName: string;
  category: CrmBudgetCategory;
  costCents: number;
  budgetCents: number;
  notes: string | null;
  assignedMemberId: string | null;
  occurredOn: string | null;
  documentsRequired: boolean;
};

type ValidatedUpdate = {
  itemName?: string;
  category?: CrmBudgetCategory;
  costCents?: number;
  budgetCents?: number;
  notes?: string | null;
  assignedMemberId?: string | null;
  occurredOn?: string | null;
  documentsRequired?: boolean;
};

function parseDocumentsRequired(value: unknown): boolean | { error: string } {
  if (typeof value === 'boolean') return value;
  return { error: 'documentsRequired must be a boolean' };
}

function parseCents(value: unknown, field: string): number | { error: string } {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    return { error: `${field} must be a non-negative number` };
  }
  return Math.round(value);
}

function parseOptionalDate(value: unknown): string | null | { error: string } {
  if (value == null || value === '') return null;
  if (typeof value !== 'string') return { error: 'occurredOn must be an ISO date string' };
  const date = value.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { error: 'occurredOn must be YYYY-MM-DD' };
  }
  return date;
}

export function validateCreateBudgetEntryBody(
  body: BudgetEntryBody
): { ok: true; input: ValidatedCreate } | { ok: false; message: string } {
  const itemName = typeof body.itemName === 'string' ? body.itemName.trim() : '';
  if (!itemName) return { ok: false, message: 'itemName is required' };

  const categoryRaw = typeof body.category === 'string' ? body.category.trim() : '';
  if (!isCrmBudgetCategory(categoryRaw)) {
    return { ok: false, message: 'category is invalid' };
  }

  const costParsed = parseCents(body.costCents ?? 0, 'costCents');
  if (typeof costParsed === 'object') return { ok: false, message: costParsed.error };
  const budgetParsed = parseCents(body.budgetCents ?? 0, 'budgetCents');
  if (typeof budgetParsed === 'object') return { ok: false, message: budgetParsed.error };

  const occurred = parseOptionalDate(body.occurredOn);
  if (occurred != null && typeof occurred === 'object' && 'error' in occurred) {
    return { ok: false, message: occurred.error };
  }

  const documentsRequired =
    body.documentsRequired === undefined
      ? true
      : parseDocumentsRequired(body.documentsRequired);
  if (typeof documentsRequired === 'object') {
    return { ok: false, message: documentsRequired.error };
  }

  return {
    ok: true,
    input: {
      itemName,
      category: categoryRaw,
      costCents: costParsed,
      budgetCents: budgetParsed,
      notes: typeof body.notes === 'string' ? body.notes.trim() || null : null,
      assignedMemberId:
        body.assignedMemberId === undefined || body.assignedMemberId === ''
          ? null
          : String(body.assignedMemberId),
      occurredOn: occurred as string | null,
      documentsRequired,
    },
  };
}

export function validateUpdateBudgetEntryBody(
  body: BudgetEntryBody
): { ok: true; input: ValidatedUpdate } | { ok: false; message: string } {
  const input: ValidatedUpdate = {};

  if (body.itemName !== undefined) {
    const itemName = typeof body.itemName === 'string' ? body.itemName.trim() : '';
    if (!itemName) return { ok: false, message: 'itemName cannot be empty' };
    input.itemName = itemName;
  }

  if (body.category !== undefined) {
    const categoryRaw = typeof body.category === 'string' ? body.category.trim() : '';
    if (!isCrmBudgetCategory(categoryRaw)) {
      return { ok: false, message: 'category is invalid' };
    }
    input.category = categoryRaw;
  }

  if (body.costCents !== undefined) {
    const costParsed = parseCents(body.costCents, 'costCents');
    if (typeof costParsed === 'object') return { ok: false, message: costParsed.error };
    input.costCents = costParsed;
  }

  if (body.budgetCents !== undefined) {
    const budgetParsed = parseCents(body.budgetCents, 'budgetCents');
    if (typeof budgetParsed === 'object') return { ok: false, message: budgetParsed.error };
    input.budgetCents = budgetParsed;
  }

  if (body.notes !== undefined) {
    input.notes = typeof body.notes === 'string' ? body.notes.trim() || null : null;
  }

  if (body.assignedMemberId !== undefined) {
    input.assignedMemberId =
      body.assignedMemberId === null || body.assignedMemberId === ''
        ? null
        : String(body.assignedMemberId);
  }

  if (body.occurredOn !== undefined) {
    const occurred = parseOptionalDate(body.occurredOn);
    if (occurred != null && typeof occurred === 'object' && 'error' in occurred) {
      return { ok: false, message: occurred.error };
    }
    input.occurredOn = occurred as string | null;
  }

  if (body.documentsRequired !== undefined) {
    const documentsRequired = parseDocumentsRequired(body.documentsRequired);
    if (typeof documentsRequired === 'object') {
      return { ok: false, message: documentsRequired.error };
    }
    input.documentsRequired = documentsRequired;
  }

  if (Object.keys(input).length === 0) {
    return { ok: false, message: 'No fields to update' };
  }

  return { ok: true, input };
}
