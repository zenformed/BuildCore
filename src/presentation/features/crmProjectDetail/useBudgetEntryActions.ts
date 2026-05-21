'use client';

import { useCallback } from 'react';
import { createCrmBudgetEntry } from '@/application/use-cases/crm/createCrmBudgetEntry';
import { deleteCrmBudgetEntry } from '@/application/use-cases/crm/deleteCrmBudgetEntry';
import { updateCrmBudgetEntry } from '@/application/use-cases/crm/updateCrmBudgetEntry';
import type { CrmBudgetCategory, CrmBudgetEntry } from '@/domain/crm';
import { crmRepositories } from '@/shared/di/container';

export type BudgetEntryDraft = {
  itemName: string;
  category: CrmBudgetCategory;
  costCents: number;
  budgetCents: number;
  documentsRequired?: boolean;
  notes?: string | null;
  assignedMemberId?: string | null;
  costIncurredAt?: string;
};

export function useBudgetEntryActions(input: {
  projectId: string;
  projectSlug: string;
  onEntryPatched: (entry: CrmBudgetEntry) => void;
  onEntryCreated: (entry: CrmBudgetEntry) => void;
  onEntryDeleted: (entryId: string) => void;
  onError: (message: string) => void;
}): {
  createEntry: (draft: BudgetEntryDraft) => Promise<void>;
  updateEntry: (
    entryId: string,
    patch: Partial<BudgetEntryDraft>
  ) => Promise<void>;
  deleteEntry: (entryId: string) => Promise<void>;
} {
  const createEntry = useCallback(
    async (draft: BudgetEntryDraft) => {
      if (!draft.costIncurredAt) {
        input.onError('Cost Date is required');
        return;
      }
      try {
        const created = await createCrmBudgetEntry(crmRepositories, {
          projectId: input.projectId,
          projectSlug: input.projectSlug,
          itemName: draft.itemName,
          category: draft.category,
          costCents: draft.costCents,
          budgetCents: draft.budgetCents,
          costIncurredAt: draft.costIncurredAt,
          notes: draft.notes,
          assignedMemberId: draft.assignedMemberId,
          documentsRequired: draft.documentsRequired,
        });
        input.onEntryCreated(created);
      } catch (err) {
        input.onError(err instanceof Error ? err.message : 'Failed to add budget item');
      }
    },
    [input]
  );

  const updateEntry = useCallback(
    async (entryId: string, patch: Partial<BudgetEntryDraft>) => {
      try {
        const updated = await updateCrmBudgetEntry(crmRepositories, {
          entryId,
          projectSlug: input.projectSlug,
          ...patch,
        });
        if (updated == null) {
          input.onError('Budget item not found');
          return;
        }
        input.onEntryPatched(updated);
      } catch (err) {
        input.onError(err instanceof Error ? err.message : 'Failed to update budget item');
      }
    },
    [input]
  );

  const deleteEntry = useCallback(
    async (entryId: string) => {
      try {
        const deleted = await deleteCrmBudgetEntry(crmRepositories, {
          entryId,
          projectSlug: input.projectSlug,
        });
        if (!deleted) {
          input.onError('Budget item not found');
          return;
        }
        input.onEntryDeleted(entryId);
      } catch (err) {
        input.onError(err instanceof Error ? err.message : 'Failed to delete budget item');
      }
    },
    [input]
  );

  return { createEntry, updateEntry, deleteEntry };
}
