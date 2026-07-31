import type { CrmDuplicateCandidate } from '@/domain/crm/identity';
import type {
  ImportDuplicateDecisionMap,
  ImportDuplicateReviewItem,
} from '@/domain/crm/importDuplicateDecisions';
import {
  IMPORT_MERGE_CUSTOM_FIELD_VISIBLE_LIMIT,
  buildContactCollectionField,
  buildCustomMergeFields,
  buildFilesMergeField,
  buildIdenticalOrScalarField,
  buildNotesMergeField,
  createDefaultMergeGroupDecision,
  type ImportMergeFieldState,
  type ImportMergeGroupDecision,
} from '@/domain/crm/importMergeReview';

export type MergeReviewFieldLabels = {
  readonly name: string;
  readonly contact: string;
  readonly email: string;
  readonly phone: string;
  readonly address: string;
  readonly stage: string;
  readonly notes: string;
  readonly photos: string;
  readonly documents: string;
};

export function resolveMergeReviewCandidate(
  item: ImportDuplicateReviewItem,
  matchedRecordId: string | undefined
): CrmDuplicateCandidate | null {
  if (matchedRecordId) {
    const matched = item.existingCandidates.find((c) => c.record.id === matchedRecordId);
    if (matched != null) return matched;
  }
  return item.existingCandidates[0] ?? null;
}

export function listMergeReviewItems(
  items: readonly ImportDuplicateReviewItem[],
  decisions: ImportDuplicateDecisionMap
): readonly ImportDuplicateReviewItem[] {
  return items.filter((item) => {
    const decision = decisions[item.incomingId];
    if (decision?.sameCustomer !== true) return false;
    return resolveMergeReviewCandidate(item, decision.matchedRecordId) != null;
  });
}

export function buildMergeReviewFields(input: {
  readonly item: ImportDuplicateReviewItem;
  readonly candidate: CrmDuplicateCandidate;
  readonly labels: MergeReviewFieldLabels;
}): ImportMergeFieldState[] {
  const { item, candidate, labels } = input;
  const record = candidate.record;
  const fields: ImportMergeFieldState[] = [];
  const push = (field: ImportMergeFieldState | null) => {
    if (field != null) fields.push(field);
  };

  push(
    buildIdenticalOrScalarField({
      fieldKey: 'contact',
      label: labels.contact,
      existingValue: record.contactName,
      importedValue: item.contactName,
    })
  );
  push(
    buildIdenticalOrScalarField({
      fieldKey: 'name',
      label: labels.name,
      existingValue: record.name,
      importedValue: item.name,
    })
  );
  push(
    buildContactCollectionField({
      fieldKey: 'phone',
      label: labels.phone,
      existingValues: record.phones,
      importedValues: item.phones.length > 0 ? item.phones : item.phone ? [item.phone] : [],
    })
  );
  push(
    buildContactCollectionField({
      fieldKey: 'email',
      label: labels.email,
      existingValues: record.emails,
      importedValues: item.emails.length > 0 ? item.emails : item.email ? [item.email] : [],
    })
  );
  push(
    buildIdenticalOrScalarField({
      fieldKey: 'address',
      label: labels.address,
      existingValue: record.addressLine,
      importedValue: item.addressLine,
      defaultAction: 'keep_existing',
    })
  );
  push(
    buildIdenticalOrScalarField({
      fieldKey: 'stage',
      label: labels.stage,
      existingValue: record.stageLabel,
      importedValue: item.stage,
      defaultAction: 'keep_existing',
    })
  );
  push(
    buildNotesMergeField({
      label: labels.notes,
      existingValue: record.notes,
      importedValue: item.notes,
    })
  );
  push(
    buildFilesMergeField({
      fieldKey: 'photos',
      label: labels.photos,
      existingCount: record.photoCount,
      importedCount: 0,
    })
  );
  push(
    buildFilesMergeField({
      fieldKey: 'documents',
      label: labels.documents,
      existingCount: record.documentCount,
      importedCount: 0,
    })
  );
  fields.push(
    ...buildCustomMergeFields({
      existing: record.customFields,
      imported: item.customFields,
    })
  );

  return fields;
}

export function ensureMergeGroupDecision(input: {
  readonly item: ImportDuplicateReviewItem;
  readonly matchedRecordId: string;
  readonly candidate: CrmDuplicateCandidate;
  readonly existing: ImportMergeGroupDecision | null | undefined;
  readonly labels: MergeReviewFieldLabels;
}): ImportMergeGroupDecision {
  if (input.existing != null && input.existing.matchedRecordId === input.matchedRecordId) {
    return input.existing;
  }
  return createDefaultMergeGroupDecision({
    incomingId: input.item.incomingId,
    matchedRecordId: input.matchedRecordId,
    fields: buildMergeReviewFields({
      item: input.item,
      candidate: input.candidate,
      labels: input.labels,
    }),
  });
}

export function visibleMergeReviewFields(
  decision: ImportMergeGroupDecision
): readonly ImportMergeFieldState[] {
  const base = decision.showIdenticalFields
    ? decision.fields
    : decision.fields.filter((field) => field.kind !== 'identical');

  const customFields = base.filter((field) => field.fieldKey.startsWith('custom:'));
  if (decision.showAllCustomFields || customFields.length <= IMPORT_MERGE_CUSTOM_FIELD_VISIBLE_LIMIT) {
    return base;
  }

  let customSeen = 0;
  return base.filter((field) => {
    if (!field.fieldKey.startsWith('custom:')) return true;
    customSeen += 1;
    return customSeen <= IMPORT_MERGE_CUSTOM_FIELD_VISIBLE_LIMIT;
  });
}

export function identicalMergeFieldCount(decision: ImportMergeGroupDecision): number {
  return decision.fields.filter((field) => field.kind === 'identical').length;
}

export function hiddenCustomFieldCount(decision: ImportMergeGroupDecision): number {
  const customCount = decision.fields.filter((field) => field.fieldKey.startsWith('custom:')).length;
  if (decision.showAllCustomFields || customCount <= IMPORT_MERGE_CUSTOM_FIELD_VISIBLE_LIMIT) {
    return 0;
  }
  return customCount - IMPORT_MERGE_CUSTOM_FIELD_VISIBLE_LIMIT;
}
