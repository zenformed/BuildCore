/**
 * Build UpdateCrmProjectInput overlays from merge-review decisions.
 * replace_existing uses imported row values; merge_into_existing uses field resolvers.
 */

import type { UpdateCrmProjectInput } from '@/domain/crm/updateProject';
import type { CrmProjectDetail } from '@/domain/crm/project';
import type { PipelineStageSlug } from '@/domain/crm/pipelineStage';
import type { ImportDuplicateReviewItem } from '@/domain/crm/importDuplicateDecisions';
import {
  resolveContactCollectionResult,
  resolveCustomResult,
  resolveNotesResult,
  resolveScalarResult,
  type ImportMergeGroupDecision,
} from '@/domain/crm/importMergeReview';
import type { CrmDuplicateCandidate } from '@/domain/crm/identity';

export function crmProjectDetailToUpdateInput(detail: CrmProjectDetail): UpdateCrmProjectInput {
  const { summary, notes } = detail;
  return {
    name: summary.name,
    industry: summary.industry,
    customIndustry: summary.customIndustry,
    contactName: summary.contact.name.trim() || summary.name,
    emails: [...summary.contact.emails],
    phones: [...summary.contact.phones],
    priority: summary.priority,
    currentStageSlug: summary.currentStageSlug,
    notes: notes,
    dealValueCents: summary.dealValueCents,
    balanceRemainingCents: summary.balanceRemainingCents,
    assignedMemberId: summary.assignedTo?.id ?? null,
    addressLine1: summary.address.addressLine1,
    addressLine2: summary.address.addressLine2,
    city: summary.address.city,
    state: summary.address.state,
    postalCode: summary.address.postalCode,
    latitude: summary.latitude,
    longitude: summary.longitude,
    parentProjectId: summary.parentProjectId,
    customFieldValues: { ...summary.customFields },
  };
}

function resolveStageSlug(input: {
  readonly preferImported: boolean;
  readonly importedStage: string | null | undefined;
  readonly existingSlug: PipelineStageSlug;
  readonly existingLabel: string;
}): PipelineStageSlug {
  if (!input.preferImported) return input.existingSlug;
  const imported = input.importedStage?.trim() ?? '';
  if (!imported) return input.existingSlug;
  if (imported.toLocaleLowerCase('en-US') === input.existingLabel.trim().toLocaleLowerCase('en-US')) {
    return input.existingSlug;
  }
  // Import create treats mapped stage text as the slug when present.
  return imported as PipelineStageSlug;
}

function applyAddressLine(
  base: UpdateCrmProjectInput,
  addressLine: string | null | undefined,
  useImported: boolean
): UpdateCrmProjectInput {
  if (!useImported) return base;
  const line = addressLine?.trim() ?? '';
  if (!line) {
    return {
      ...base,
      addressLine1: null,
      addressLine2: null,
      city: null,
      state: null,
      postalCode: null,
    };
  }
  return {
    ...base,
    addressLine1: line,
    addressLine2: null,
    city: null,
    state: null,
    postalCode: null,
  };
}

/** Full replace: imported row wins for mapped identity/contact fields. */
export function buildReplaceUpdateInput(input: {
  readonly detail: CrmProjectDetail;
  readonly item: ImportDuplicateReviewItem;
  readonly candidate: CrmDuplicateCandidate;
}): UpdateCrmProjectInput {
  const base = crmProjectDetailToUpdateInput(input.detail);
  const name = input.item.name.trim() || base.name;
  const contactName =
    input.item.contactName?.trim() || name || base.contactName;
  const emails =
    input.item.emails.length > 0
      ? [...input.item.emails]
      : input.item.email
        ? [input.item.email]
        : [];
  const phones =
    input.item.phones.length > 0
      ? [...input.item.phones]
      : input.item.phone
        ? [input.item.phone]
        : [];

  const customFieldValues: Record<string, string | null> = {
    ...(base.customFieldValues ?? {}),
  };
  for (const field of input.item.customFields) {
    customFieldValues[field.fieldKey] = field.valueText;
  }

  let next = applyAddressLine(base, input.item.addressLine, true);
  next = {
    ...next,
    name,
    contactName,
    emails,
    phones,
    notes: input.item.notes?.trim() ? input.item.notes.trim() : null,
    currentStageSlug: resolveStageSlug({
      preferImported: true,
      importedStage: input.item.stage,
      existingSlug: input.detail.summary.currentStageSlug,
      existingLabel: input.candidate.record.stageLabel,
    }),
    customFieldValues,
  };
  return next;
}

/** Merge into existing: honor field-level merge actions. */
export function buildMergeIntoUpdateInput(input: {
  readonly detail: CrmProjectDetail;
  readonly item: ImportDuplicateReviewItem;
  readonly candidate: CrmDuplicateCandidate;
  readonly decision: ImportMergeGroupDecision;
}): UpdateCrmProjectInput {
  const base = crmProjectDetailToUpdateInput(input.detail);
  let name = base.name;
  let contactName = base.contactName;
  let emails = [...base.emails];
  let phones = [...base.phones];
  let notes = base.notes;
  let currentStageSlug = base.currentStageSlug;
  let useImportedAddress = false;
  const customFieldValues: Record<string, string | null> = {
    ...(base.customFieldValues ?? {}),
  };

  for (const field of input.decision.fields) {
    if (field.kind === 'identical') {
      if (field.fieldKey.startsWith('custom:')) {
        const key = field.fieldKey.slice('custom:'.length);
        customFieldValues[key] = field.value;
      }
      continue;
    }
    if (field.kind === 'scalar') {
      const value = resolveScalarResult(field);
      if (field.fieldKey === 'name') name = value || name;
      if (field.fieldKey === 'contact') contactName = value || contactName;
      if (field.fieldKey === 'stage') {
        currentStageSlug = resolveStageSlug({
          preferImported: field.action === 'use_imported',
          importedStage: field.importedValue,
          existingSlug: input.detail.summary.currentStageSlug,
          existingLabel: input.candidate.record.stageLabel,
        });
      }
      if (field.fieldKey === 'address') {
        useImportedAddress = field.action === 'use_imported';
      }
      continue;
    }
    if (field.kind === 'contact_collection') {
      const resolved = resolveContactCollectionResult(field).map((entry) => entry.value);
      if (field.fieldKey === 'email') emails = resolved;
      if (field.fieldKey === 'phone') phones = resolved;
      continue;
    }
    if (field.kind === 'notes') {
      const resolved = resolveNotesResult(field).trim();
      notes = resolved.length > 0 ? resolved : null;
      continue;
    }
    if (field.kind === 'custom') {
      const key = field.fieldKey.startsWith('custom:')
        ? field.fieldKey.slice('custom:'.length)
        : field.fieldKey;
      customFieldValues[key] = resolveCustomResult(field);
    }
  }

  let next = applyAddressLine(base, input.item.addressLine, useImportedAddress);
  next = {
    ...next,
    name,
    contactName: contactName.trim() || name,
    emails,
    phones,
    notes,
    currentStageSlug,
    customFieldValues,
  };
  return next;
}

export function buildUpdateInputForMergeDecision(input: {
  readonly detail: CrmProjectDetail;
  readonly item: ImportDuplicateReviewItem;
  readonly candidate: CrmDuplicateCandidate;
  readonly decision: ImportMergeGroupDecision;
}): UpdateCrmProjectInput | null {
  if (input.decision.recordAction === 'keep_both') return null;
  if (input.decision.recordAction === 'replace_existing') {
    return buildReplaceUpdateInput(input);
  }
  return buildMergeIntoUpdateInput(input);
}
