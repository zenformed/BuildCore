/**
 * Apply merge/replace decisions onto existing CRM records before import create.
 */

import { getCrmProjectDetailBySlug, updateCrmProject } from '@/application/use-cases/crm';
import type { CrmRepositories } from '@/application/ports/crm';
import type { ImportDuplicateDecisionMap } from '@/domain/crm/importDuplicateDecisions';
import type { ImportDuplicateReviewItem } from '@/domain/crm/importDuplicateDecisions';
import { buildUpdateInputForMergeDecision } from '@/domain/crm/applyImportMergeDecision';
import type { ImportMergeDecisionMap } from '@/domain/crm/importMergeReview';
import { resolveMergeReviewCandidate } from '@/presentation/features/crmImport/interview/mergeReviewPresentation';

export type ApplyImportMergeDecisionsResult = {
  readonly appliedSourceRowIndexes: readonly number[];
  readonly updatedRecordIds: readonly string[];
};

export async function applyImportMergeDecisions(input: {
  readonly repositories: CrmRepositories;
  readonly reviewItems: readonly ImportDuplicateReviewItem[];
  readonly duplicateDecisions: ImportDuplicateDecisionMap;
  readonly mergeDecisions: ImportMergeDecisionMap;
}): Promise<ApplyImportMergeDecisionsResult> {
  const appliedSourceRowIndexes: number[] = [];
  const updatedRecordIds: string[] = [];

  for (const item of input.reviewItems) {
    const duplicate = input.duplicateDecisions[item.incomingId];
    if (duplicate?.sameCustomer !== true) continue;

    const decision = input.mergeDecisions[item.incomingId];
    if (decision == null) continue;
    if (decision.recordAction === 'keep_both') continue;

    const candidate = resolveMergeReviewCandidate(item, decision.matchedRecordId);
    if (candidate == null) {
      throw new Error(
        `Could not resolve the existing record to update for row ${item.displayRowNumber}.`
      );
    }

    const detail = await getCrmProjectDetailBySlug(
      input.repositories,
      candidate.record.slug
    );
    if (detail == null) {
      throw new Error(
        `Could not load existing record “${candidate.record.name}” for merge/replace.`
      );
    }

    const updateInput = buildUpdateInputForMergeDecision({
      detail,
      item,
      candidate,
      decision,
    });
    if (updateInput == null) continue;

    const updated = await updateCrmProject(
      input.repositories,
      candidate.record.slug,
      updateInput
    );
    if (updated == null) {
      throw new Error(
        `Failed to update existing record “${candidate.record.name}”.`
      );
    }

    appliedSourceRowIndexes.push(item.sourceRowIndex);
    updatedRecordIds.push(candidate.record.id);
  }

  return {
    appliedSourceRowIndexes: appliedSourceRowIndexes.sort((a, b) => a - b),
    updatedRecordIds,
  };
}
