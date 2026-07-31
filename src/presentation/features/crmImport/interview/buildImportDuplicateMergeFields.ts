import type { CrmDuplicateCandidate, MergeFieldState } from '@/domain/crm/identity';
import {
  buildMultiMergeField,
  buildScalarMergeField,
  defaultMergeFieldsForUpdateExisting,
} from '@/domain/crm/identity';
import type { ImportDuplicateReviewItem } from '@/domain/crm/importDuplicateDecisions';

/**
 * Build keep-value merge fields for one import duplicate row vs its best existing match.
 * Used by the Update Existing UI preview (merge not applied yet).
 */
export function buildImportDuplicateMergeFields(input: {
  readonly item: ImportDuplicateReviewItem;
  readonly candidate: CrmDuplicateCandidate;
  readonly labels: {
    readonly name: string;
    readonly contact: string;
    readonly email: string;
    readonly phone: string;
    readonly address: string;
  };
}): MergeFieldState[] {
  const { item, candidate, labels } = input;
  const record = candidate.record;
  const fields: MergeFieldState[] = [];

  const push = (field: MergeFieldState | null) => {
    if (field != null) fields.push(field);
  };

  push(
    buildScalarMergeField({
      fieldKey: 'name',
      label: labels.name,
      incomingValue: item.name,
      existingValue: record.name,
    })
  );
  push(
    buildScalarMergeField({
      fieldKey: 'contact',
      label: labels.contact,
      incomingValue: item.contactName,
      existingValue: record.contactName,
    })
  );
  push(
    buildMultiMergeField({
      fieldKey: 'email',
      label: labels.email,
      incomingValues: item.email ? [item.email] : [],
      existingValues: record.emails,
    })
  );
  push(
    buildMultiMergeField({
      fieldKey: 'phone',
      label: labels.phone,
      incomingValues: item.phone ? [item.phone] : [],
      existingValues: record.phones,
    })
  );
  push(
    buildScalarMergeField({
      fieldKey: 'address',
      label: labels.address,
      incomingValue: item.addressLine,
      existingValue: record.addressLine,
    })
  );

  return defaultMergeFieldsForUpdateExisting(fields);
}
