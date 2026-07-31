import type { SupabaseClient } from '@supabase/supabase-js';
import { resolveDerivedWorkflowStageSlugFromProgressInput } from '@/domain/buildcore/projectPipelineProgress';
import { formatCrmProjectAddressLine } from '@/domain/crm/projectAddress';
import {
  getWorkflowProgressInputForProject,
  type CrmProjectWorkflowProgressInputIndex,
} from '@/domain/crm/projectWorkflowProgressInput';
import {
  CRM_DUPLICATE_DETECTION_LIMITS,
  type CrmDuplicateCandidate,
  type CrmDuplicateCandidateGroup,
  type CrmDuplicateCandidateRecordSummary,
  type CrmDuplicateConfidence,
  type CrmDuplicateLifecycleStatus,
  type CrmDuplicateTruncationMeta,
  type CrmDuplicateTruncationReason,
} from '@/domain/crm/identity/duplicateCandidateTypes';
import {
  extractIdentityValues,
  type CrmIdentityCustomFieldValue,
  type CrmIdentityNameParts,
  type CrmIdentityRecordSnapshot,
  type CrmIdentityRecordType,
  type CrmIdentityValueType,
} from '@/domain/crm/identity';
import {
  accumulateBestCandidatesAcrossRecordChunks,
  buildDuplicateCandidateGroups,
  buildIncomingIncomingEdges,
  matchProbeAgainstIdentityHits,
  parseIdentityLookupKey,
  uniqueLookupKeysWithinLimit,
  type CrmDuplicateIdentityHit,
  type CrmDuplicateProbeDrafts,
} from '@/domain/crm/identity/duplicateMatchingCore';
import { listWorkflowProgressInputsByProjectIds } from '../crmReadService';
import { loadOrganizationPipelineStageCatalog } from '../pipelineStageService';
import {
  listProjectCustomFieldDefinitionsForOrg,
  loadProjectCustomFieldsMapForProjectIds,
} from '../buildCoreProjectCustomFieldService';

export type CrmDuplicateProbeInput = {
  readonly incomingId?: string;
  readonly recordType?: CrmIdentityRecordType;
  readonly projectName?: string | null;
  readonly contactName?: string | null;
  readonly emails?: readonly string[];
  readonly phones?: readonly string[];
  readonly address?: CrmIdentityRecordSnapshot['address'];
  readonly nameParts?: CrmIdentityNameParts;
  readonly customFields?: readonly CrmIdentityCustomFieldValue[];
};

export type FindCrmDuplicateCandidatesOptions = {
  readonly probe: CrmDuplicateProbeInput;
  readonly excludeRecordId?: string | null;
  readonly maxCandidates?: number;
  readonly minConfidence?: CrmDuplicateConfidence;
  /** When true, include soft-deleted/archived CRM records. Default false. */
  readonly includeArchived?: boolean;
};

export type FindCrmDuplicateCandidatesResult = {
  readonly candidates: readonly CrmDuplicateCandidate[];
  readonly meta: CrmDuplicateTruncationMeta;
};

export type FindCrmDuplicateCandidatesBatchOptions = {
  readonly items: readonly (CrmDuplicateProbeInput & { readonly incomingId: string })[];
  readonly excludeRecordIds?: readonly string[];
  readonly maxCandidatesPerIncoming?: number;
  readonly maxGroups?: number;
  readonly minConfidence?: CrmDuplicateConfidence;
  readonly includeIncomingMatches?: boolean;
  /** When true, include soft-deleted/archived CRM records. Default false. */
  readonly includeArchived?: boolean;
};

export type FindCrmDuplicateCandidatesBatchResult = {
  readonly groups: readonly CrmDuplicateCandidateGroup[];
  readonly meta: CrmDuplicateTruncationMeta;
};

export class CrmDuplicateDetectionValidationError extends Error {
  readonly code: string;
  readonly details?: Record<string, unknown>;

  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'CrmDuplicateDetectionValidationError';
    this.code = code;
    this.details = details;
  }
}

type DbIdentityValueRow = {
  record_id: string;
  value_type: string;
  normalized_value: string;
  source_kind: string;
  source_field_key: string | null;
  source_field_label: string | null;
};

type DbCandidateProjectRow = {
  id: string;
  slug: string;
  parent_project_id: string | null;
  name: string;
  notes: string | null;
  subproject_status: string;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  address_line_1: string | null;
  address_line_2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  crm_contacts: {
    full_name: string;
    email: string | null;
    phone: string | null;
    contact_emails: string[] | null;
    contact_phones: string[] | null;
  } | null;
};

function emptyAddress(): CrmIdentityRecordSnapshot['address'] {
  return {
    addressLine1: null,
    addressLine2: null,
    city: null,
    state: null,
    postalCode: null,
  };
}

function toSnapshot(
  organizationId: string,
  probe: CrmDuplicateProbeInput,
  syntheticRecordId: string
): CrmIdentityRecordSnapshot {
  return {
    organizationId,
    recordId: syntheticRecordId,
    recordType: probe.recordType ?? 'subproject',
    projectName: probe.projectName ?? null,
    contactName: probe.contactName ?? null,
    emails: probe.emails ?? [],
    phones: probe.phones ?? [],
    address: probe.address ?? emptyAddress(),
    nameParts: probe.nameParts,
    customFields: probe.customFields ?? [],
  };
}

function chunkArray<T>(items: readonly T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

function resolveLifecycleStatus(
  archivedAt: string | null,
  subprojectStatus: string
): CrmDuplicateLifecycleStatus {
  if (archivedAt != null) return 'archived';
  if (subprojectStatus === 'inactive') return 'inactive';
  return 'active';
}

function emailsFromContact(
  contact: DbCandidateProjectRow['crm_contacts']
): readonly string[] {
  if (contact == null) return [];
  const fromArray = (contact.contact_emails ?? []).filter((v) => v.trim().length > 0);
  if (fromArray.length > 0) return fromArray;
  if (contact.email?.trim()) return [contact.email];
  return [];
}

function phonesFromContact(
  contact: DbCandidateProjectRow['crm_contacts']
): readonly string[] {
  if (contact == null) return [];
  const fromArray = (contact.contact_phones ?? []).filter((v) => v.trim().length > 0);
  if (fromArray.length > 0) return fromArray;
  if (contact.phone?.trim()) return [contact.phone];
  return [];
}

async function loadCandidateRecordSummaries(
  supabase: SupabaseClient,
  organizationId: string,
  recordIds: readonly string[]
): Promise<Map<string, CrmDuplicateCandidateRecordSummary>> {
  const map = new Map<string, CrmDuplicateCandidateRecordSummary>();
  if (recordIds.length === 0) return map;

  const uniqueIds = [...new Set(recordIds)];
  const rows: DbCandidateProjectRow[] = [];

  for (const chunk of chunkArray(
    uniqueIds,
    CRM_DUPLICATE_DETECTION_LIMITS.recordIdInChunkSize
  )) {
    const { data, error } = await supabase
      .from('crm_projects')
      .select(
        `
        id,
        slug,
        parent_project_id,
        name,
        notes,
        subproject_status,
        archived_at,
        created_at,
        updated_at,
        address_line_1,
        address_line_2,
        city,
        state,
        postal_code,
        crm_contacts:primary_contact_id (
          full_name,
          email,
          phone,
          contact_emails,
          contact_phones
        )
      `
      )
      .eq('organization_id', organizationId)
      .in('id', chunk);

    if (error) {
      throw new Error(`crm_duplicate_candidates_load_records_failed: ${error.message}`);
    }
    rows.push(...((data as unknown as DbCandidateProjectRow[] | null) ?? []));
  }

  const parentIds = [
    ...new Set(
      rows
        .map((row) => row.parent_project_id)
        .filter((id): id is string => typeof id === 'string' && id.length > 0)
    ),
  ];
  const parentNameById = new Map<string, string>();
  const parentSlugById = new Map<string, string>();
  for (const chunk of chunkArray(
    parentIds,
    CRM_DUPLICATE_DETECTION_LIMITS.recordIdInChunkSize
  )) {
    if (chunk.length === 0) continue;
    const { data, error } = await supabase
      .from('crm_projects')
      .select('id, name, slug')
      .eq('organization_id', organizationId)
      .in('id', chunk);
    if (error) {
      throw new Error(`crm_duplicate_candidates_load_parents_failed: ${error.message}`);
    }
    for (const row of data ?? []) {
      parentNameById.set(row.id as string, row.name as string);
      parentSlugById.set(row.id as string, row.slug as string);
    }
  }

  const projectCatalog = await loadOrganizationPipelineStageCatalog(
    supabase,
    organizationId,
    'project'
  );
  const subprojectCatalog = await loadOrganizationPipelineStageCatalog(
    supabase,
    organizationId,
    'subproject'
  );
  const projectStageLabel = new Map(projectCatalog.map((s) => [s.slug, s.label] as const));
  const subprojectStageLabel = new Map(subprojectCatalog.map((s) => [s.slug, s.label] as const));

  let workflowProgressIndex: CrmProjectWorkflowProgressInputIndex = new Map();
  try {
    workflowProgressIndex = await listWorkflowProgressInputsByProjectIds(
      supabase,
      organizationId,
      rows.map((row) => row.id)
    );
  } catch (error) {
    throw new Error(
      `crm_duplicate_candidates_load_workflow_progress_failed: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  const photoCountById = new Map<string, number>();
  const documentCountById = new Map<string, number>();
  for (const chunk of chunkArray(
    rows.map((row) => row.id),
    CRM_DUPLICATE_DETECTION_LIMITS.recordIdInChunkSize
  )) {
    if (chunk.length === 0) continue;
    const { data, error } = await supabase
      .from('crm_documents')
      .select('project_id, document_type')
      .eq('organization_id', organizationId)
      .in('project_id', chunk)
      .eq('upload_status', 'ready');
    if (error) {
      throw new Error(`crm_duplicate_candidates_load_documents_failed: ${error.message}`);
    }
    for (const doc of data ?? []) {
      const projectId = doc.project_id as string;
      if ((doc.document_type as string) === 'photo') {
        photoCountById.set(projectId, (photoCountById.get(projectId) ?? 0) + 1);
      } else {
        documentCountById.set(projectId, (documentCountById.get(projectId) ?? 0) + 1);
      }
    }
  }

  const [projectDefs, subprojectDefs, customValuesByProjectId] = await Promise.all([
    listProjectCustomFieldDefinitionsForOrg(supabase, organizationId, { scope: 'project' }),
    listProjectCustomFieldDefinitionsForOrg(supabase, organizationId, { scope: 'subproject' }),
    loadProjectCustomFieldsMapForProjectIds(
      supabase,
      organizationId,
      rows.map((row) => ({
        id: row.id,
        parentProjectId: row.parent_project_id,
      }))
    ),
  ]);
  const customLabelByKey = new Map<string, string>();
  for (const def of [...projectDefs, ...subprojectDefs]) {
    customLabelByKey.set(def.fieldKey, def.label);
  }

  for (const row of rows) {
    const recordType = row.parent_project_id == null ? 'project' : 'subproject';
    const catalog = recordType === 'project' ? projectCatalog : subprojectCatalog;
    const stageMap = recordType === 'project' ? projectStageLabel : subprojectStageLabel;
    const derivedStageSlug = resolveDerivedWorkflowStageSlugFromProgressInput({
      workflowProgressInput: getWorkflowProgressInputForProject(workflowProgressIndex, row.id),
      stages: catalog,
    });
    const addressLine = formatCrmProjectAddressLine({
      addressLine1: row.address_line_1,
      addressLine2: row.address_line_2,
      city: row.city,
      state: row.state,
      postalCode: row.postal_code,
    });
    const customValueMap = customValuesByProjectId.get(row.id) ?? {};
    const customFields = Object.entries(customValueMap)
      .map(([fieldKey, valueText]) => ({
        fieldKey,
        label: customLabelByKey.get(fieldKey) ?? fieldKey,
        valueText: (valueText ?? '').trim(),
      }))
      .filter((field) => field.valueText.length > 0)
      .sort((a, b) => a.label.localeCompare(b.label));
    map.set(row.id, {
      id: row.id,
      slug: row.slug,
      recordType,
      name: row.name,
      parentProjectId: row.parent_project_id,
      parentProjectSlug:
        row.parent_project_id != null
          ? (parentSlugById.get(row.parent_project_id) ?? null)
          : null,
      parentProjectName:
        row.parent_project_id != null
          ? (parentNameById.get(row.parent_project_id) ?? null)
          : null,
      contactName: row.crm_contacts?.full_name ?? null,
      emails: emailsFromContact(row.crm_contacts),
      phones: phonesFromContact(row.crm_contacts),
      addressLine,
      notes: row.notes?.trim() || null,
      photoCount: photoCountById.get(row.id) ?? 0,
      documentCount: documentCountById.get(row.id) ?? 0,
      customFields,
      stageSlug: derivedStageSlug,
      stageLabel: stageMap.get(derivedStageSlug) ?? derivedStageSlug,
      lifecycleStatus: resolveLifecycleStatus(row.archived_at, row.subproject_status),
      subprojectStatus: row.subproject_status,
      archivedAt: row.archived_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }

  return map;
}

async function refreshCustomFieldLabelsOnHits(
  supabase: SupabaseClient,
  organizationId: string,
  hits: CrmDuplicateIdentityHit[]
): Promise<CrmDuplicateIdentityHit[]> {
  const needsRefresh = hits.some((hit) => hit.sourceKind === 'custom_field');
  if (!needsRefresh) return hits;

  const [projectDefs, subprojectDefs] = await Promise.all([
    listProjectCustomFieldDefinitionsForOrg(supabase, organizationId, { scope: 'project' }),
    listProjectCustomFieldDefinitionsForOrg(supabase, organizationId, { scope: 'subproject' }),
  ]);
  const labelByKey = new Map<string, string>();
  for (const def of [...projectDefs, ...subprojectDefs]) {
    labelByKey.set(def.fieldKey, def.label);
  }

  return hits.map((hit) => {
    if (hit.sourceKind !== 'custom_field' || hit.sourceFieldKey == null) return hit;
    // Combined first+last keys like "first_name+last_name" — leave as stored
    if (hit.sourceFieldKey.includes('+')) return hit;
    const current = labelByKey.get(hit.sourceFieldKey);
    if (current == null || current === hit.sourceFieldLabel) return hit;
    return { ...hit, sourceFieldLabel: current };
  });
}

async function queryIdentityHitsForLookupKeys(
  supabase: SupabaseClient,
  organizationId: string,
  lookupKeys: readonly string[]
): Promise<CrmDuplicateIdentityHit[]> {
  const byType = new Map<CrmIdentityValueType, string[]>();
  for (const key of lookupKeys) {
    const parsed = parseIdentityLookupKey(key);
    if (parsed == null) continue;
    const list = byType.get(parsed.valueType) ?? [];
    list.push(parsed.normalizedValue);
    byType.set(parsed.valueType, list);
  }

  const hits: CrmDuplicateIdentityHit[] = [];
  for (const [valueType, values] of byType) {
    const uniqueValues = [...new Set(values)];
    for (const chunk of chunkArray(
      uniqueValues,
      CRM_DUPLICATE_DETECTION_LIMITS.identityValueInChunkSize
    )) {
      const { data, error } = await supabase
        .from('crm_record_identity_values')
        .select(
          'record_id, value_type, normalized_value, source_kind, source_field_key, source_field_label'
        )
        .eq('organization_id', organizationId)
        .eq('value_type', valueType)
        .in('normalized_value', chunk);

      if (error) {
        throw new Error(`crm_duplicate_candidates_identity_lookup_failed: ${error.message}`);
      }

      for (const row of (data as DbIdentityValueRow[] | null) ?? []) {
        hits.push({
          recordId: row.record_id,
          valueType: row.value_type as CrmIdentityValueType,
          normalizedValue: row.normalized_value,
          sourceKind: row.source_kind,
          sourceFieldKey: row.source_field_key,
          sourceFieldLabel: row.source_field_label,
        });
      }
    }
  }

  return refreshCustomFieldLabelsOnHits(supabase, organizationId, hits);
}

function buildProbes(
  organizationId: string,
  items: readonly (CrmDuplicateProbeInput & { incomingId: string })[]
): CrmDuplicateProbeDrafts[] {
  return items.map((item) => {
    const snapshot = toSnapshot(organizationId, item, `probe:${item.incomingId}`);
    return {
      incomingId: item.incomingId,
      drafts: extractIdentityValues(snapshot),
    };
  });
}

function logDuplicateTruncationDiagnostics(input: {
  readonly organizationId: string;
  readonly meta: CrmDuplicateTruncationMeta;
  readonly elapsedMs: number;
}): void {
  if (!input.meta.truncated) return;
  console.info('[crm.duplicate_candidates.truncated]', {
    organizationId: input.organizationId,
    incomingRowCount: input.meta.incomingRowCount ?? null,
    reasons: input.meta.reasons ?? [],
    uniqueIdentityValueCount: input.meta.uniqueIdentityValueCount ?? null,
    searchedIdentityValueCount: input.meta.searchedIdentityValueCount ?? null,
    matchingExistingRecordCount: input.meta.matchingExistingRecordCount ?? null,
    searchedExistingRecordCount: input.meta.searchedExistingRecordCount ?? null,
    totalCandidateCount: input.meta.totalCandidateCount ?? null,
    returnedCandidateCount: input.meta.returnedCandidateCount,
    totalGroupCount: input.meta.totalGroupCount ?? null,
    returnedGroupCount: input.meta.returnedGroupCount ?? null,
    elapsedMs: input.elapsedMs,
  });
}

/**
 * Hydrate + score existing records in bounded chunks until all matching IDs
 * are processed (or a chunk fails). Retains global best candidates per incoming.
 */
async function scoreExistingRecordsInChunks(input: {
  readonly supabase: SupabaseClient;
  readonly organizationId: string;
  readonly probes: readonly CrmDuplicateProbeDrafts[];
  readonly hits: readonly CrmDuplicateIdentityHit[];
  readonly recordIds: readonly string[];
  readonly maxCandidatesPerIncoming: number;
  readonly minConfidence?: CrmDuplicateConfidence;
  readonly includeArchived: boolean;
  readonly excludeRecordId?: string | null;
}): Promise<{
  readonly perIncoming: Map<
    string,
    { readonly candidates: readonly CrmDuplicateCandidate[]; readonly truncated: boolean }
  >;
  readonly searchedExistingRecordCount: number;
  readonly chunkFailed: boolean;
  readonly totalCandidateCount: number;
  readonly returnedCandidateCount: number;
  readonly candidateLimitTruncated: boolean;
}> {
  const matchingExistingRecordCount = new Set(input.recordIds).size;
  const result = await accumulateBestCandidatesAcrossRecordChunks({
    incomingIds: input.probes.map((probe) => probe.incomingId),
    recordIds: input.recordIds,
    chunkSize: CRM_DUPLICATE_DETECTION_LIMITS.maxExistingRecordsPerQuery,
    maxCandidatesPerIncoming: input.maxCandidatesPerIncoming,
    scoreChunk: async (chunkIds) => {
      const recordsById = await loadCandidateRecordSummaries(
        input.supabase,
        input.organizationId,
        chunkIds
      );
      const chunkIdSet = new Set(chunkIds);
      const chunkHits = input.hits.filter((hit) => chunkIdSet.has(hit.recordId));
      const scored = new Map<string, readonly CrmDuplicateCandidate[]>();
      for (const probe of input.probes) {
        const matched = matchProbeAgainstIdentityHits({
          probe,
          hits: chunkHits,
          recordsById,
          excludeRecordId: input.excludeRecordId,
          // Defer maxCandidates until all chunks are merged.
          maxCandidates: Number.MAX_SAFE_INTEGER,
          maxEvidenceItems: CRM_DUPLICATE_DETECTION_LIMITS.maxEvidenceItems,
          minConfidence: input.minConfidence,
          includeArchived: input.includeArchived,
        });
        scored.set(probe.incomingId, matched.candidates);
      }
      return scored;
    },
  });

  if (result.chunkFailed) {
    console.warn('[crm.duplicate_candidates.existing_record_chunk_failed]', {
      organizationId: input.organizationId,
      searchedExistingRecordCount: result.searchedExistingRecordCount,
      matchingExistingRecordCount,
      message: result.chunkFailureMessage,
    });
  }

  return {
    perIncoming: result.perIncoming,
    searchedExistingRecordCount: result.searchedExistingRecordCount,
    chunkFailed: result.chunkFailed,
    totalCandidateCount: result.totalCandidateCount,
    returnedCandidateCount: result.returnedCandidateCount,
    candidateLimitTruncated: result.candidateLimitTruncated,
  };
}

export async function findCrmDuplicateCandidates(
  supabase: SupabaseClient,
  organizationId: string,
  options: FindCrmDuplicateCandidatesOptions
): Promise<FindCrmDuplicateCandidatesResult> {
  const startedAt = Date.now();
  const maxCandidates =
    options.maxCandidates ?? CRM_DUPLICATE_DETECTION_LIMITS.maxCandidatesPerIncoming;
  if (maxCandidates < 1 || maxCandidates > CRM_DUPLICATE_DETECTION_LIMITS.maxCandidatesPerIncoming) {
    throw new CrmDuplicateDetectionValidationError(
      'invalid_max_candidates',
      `maxCandidates must be between 1 and ${CRM_DUPLICATE_DETECTION_LIMITS.maxCandidatesPerIncoming}.`
    );
  }

  const probe: CrmDuplicateProbeDrafts = {
    incomingId: options.probe.incomingId ?? 'probe',
    drafts: extractIdentityValues(
      toSnapshot(organizationId, options.probe, options.probe.incomingId ?? 'probe')
    ),
  };

  const keyResult = uniqueLookupKeysWithinLimit([probe]);
  const reasons: CrmDuplicateTruncationReason[] = [];
  if (keyResult.truncated) {
    reasons.push('max_unique_identity_values');
  }

  const hits = await queryIdentityHitsForLookupKeys(supabase, organizationId, keyResult.keys);
  const recordIds = [...new Set(hits.map((h) => h.recordId))];

  const scored = await scoreExistingRecordsInChunks({
    supabase,
    organizationId,
    probes: [probe],
    hits,
    recordIds,
    maxCandidatesPerIncoming: maxCandidates,
    minConfidence: options.minConfidence,
    includeArchived: options.includeArchived === true,
    excludeRecordId: options.excludeRecordId,
  });

  if (scored.chunkFailed) reasons.push('existing_record_chunk_failed');
  if (scored.candidateLimitTruncated) reasons.push('max_candidates_per_incoming');

  const candidates = scored.perIncoming.get(probe.incomingId)?.candidates ?? [];
  const uniqueReasons = [...new Set(reasons)];
  const meta: CrmDuplicateTruncationMeta = {
    truncated: uniqueReasons.length > 0,
    reasons: uniqueReasons.length > 0 ? uniqueReasons : undefined,
    incomingRowCount: 1,
    uniqueIdentityValueCount: keyResult.uniqueIdentityValueCount,
    searchedIdentityValueCount: keyResult.searchedIdentityValueCount,
    matchingExistingRecordCount: recordIds.length,
    searchedExistingRecordCount: scored.searchedExistingRecordCount,
    totalCandidateCount: scored.totalCandidateCount,
    returnedCandidateCount: candidates.length,
  };
  logDuplicateTruncationDiagnostics({
    organizationId,
    meta,
    elapsedMs: Date.now() - startedAt,
  });

  return { candidates, meta };
}

export async function findCrmDuplicateCandidatesBatch(
  supabase: SupabaseClient,
  organizationId: string,
  options: FindCrmDuplicateCandidatesBatchOptions
): Promise<FindCrmDuplicateCandidatesBatchResult> {
  const startedAt = Date.now();
  const items = options.items;
  if (items.length === 0) {
    return {
      groups: [],
      meta: {
        truncated: false,
        returnedCandidateCount: 0,
        returnedGroupCount: 0,
        totalGroupCount: 0,
        incomingRowCount: 0,
        uniqueIdentityValueCount: 0,
        searchedIdentityValueCount: 0,
        matchingExistingRecordCount: 0,
        searchedExistingRecordCount: 0,
      },
    };
  }
  if (items.length > CRM_DUPLICATE_DETECTION_LIMITS.maxBatchRows) {
    throw new CrmDuplicateDetectionValidationError(
      'batch_too_large',
      `Batch supports at most ${CRM_DUPLICATE_DETECTION_LIMITS.maxBatchRows} rows per request.`,
      { maxBatchRows: CRM_DUPLICATE_DETECTION_LIMITS.maxBatchRows, received: items.length }
    );
  }

  const incomingIds = new Set<string>();
  for (const item of items) {
    if (!item.incomingId.trim()) {
      throw new CrmDuplicateDetectionValidationError(
        'invalid_incoming_id',
        'Each batch item requires a non-empty incomingId.'
      );
    }
    if (incomingIds.has(item.incomingId)) {
      throw new CrmDuplicateDetectionValidationError(
        'duplicate_incoming_id',
        `Duplicate incomingId in batch: ${item.incomingId}`
      );
    }
    incomingIds.add(item.incomingId);
  }

  const maxCandidatesPerIncoming =
    options.maxCandidatesPerIncoming ??
    CRM_DUPLICATE_DETECTION_LIMITS.maxCandidatesPerIncoming;
  if (
    maxCandidatesPerIncoming < 1 ||
    maxCandidatesPerIncoming > CRM_DUPLICATE_DETECTION_LIMITS.maxCandidatesPerIncoming
  ) {
    throw new CrmDuplicateDetectionValidationError(
      'invalid_max_candidates',
      `maxCandidatesPerIncoming must be between 1 and ${CRM_DUPLICATE_DETECTION_LIMITS.maxCandidatesPerIncoming}.`
    );
  }

  const probes = buildProbes(organizationId, items);
  const keyResult = uniqueLookupKeysWithinLimit(probes);
  const reasons: CrmDuplicateTruncationReason[] = [];
  if (keyResult.truncated) reasons.push('max_unique_identity_values');

  const hits = await queryIdentityHitsForLookupKeys(supabase, organizationId, keyResult.keys);
  const excludeSet = new Set(
    (options.excludeRecordIds ?? []).map((id) => id.trim()).filter(Boolean)
  );

  const filteredHits = hits.filter((h) => !excludeSet.has(h.recordId));
  const recordIds = [...new Set(filteredHits.map((h) => h.recordId))];

  const scored = await scoreExistingRecordsInChunks({
    supabase,
    organizationId,
    probes,
    hits: filteredHits,
    recordIds,
    maxCandidatesPerIncoming,
    minConfidence: options.minConfidence,
    includeArchived: options.includeArchived === true,
  });

  if (scored.chunkFailed) reasons.push('existing_record_chunk_failed');
  if (scored.candidateLimitTruncated) reasons.push('max_candidates_per_incoming');

  const includeIncoming = options.includeIncomingMatches !== false;
  const incomingEdges = includeIncoming
    ? buildIncomingIncomingEdges(probes, options.minConfidence)
    : [];

  const maxGroups = options.maxGroups ?? items.length;
  const grouped = buildDuplicateCandidateGroups({
    probes,
    perIncomingCandidates: scored.perIncoming,
    incomingEdges,
    maxEvidenceItems: CRM_DUPLICATE_DETECTION_LIMITS.maxEvidenceItems,
    maxGroups,
    minConfidence: options.minConfidence,
  });
  if (grouped.truncated) {
    reasons.push('max_groups');
  }

  const uniqueReasons = [...new Set(reasons)];
  const meta: CrmDuplicateTruncationMeta = {
    truncated: uniqueReasons.length > 0 || grouped.truncated,
    reasons: uniqueReasons.length > 0 ? uniqueReasons : undefined,
    incomingRowCount: items.length,
    uniqueIdentityValueCount: keyResult.uniqueIdentityValueCount,
    searchedIdentityValueCount: keyResult.searchedIdentityValueCount,
    matchingExistingRecordCount: recordIds.length,
    searchedExistingRecordCount: scored.searchedExistingRecordCount,
    totalCandidateCount: scored.totalCandidateCount,
    returnedCandidateCount: scored.returnedCandidateCount,
    totalGroupCount: grouped.totalGroupCount,
    returnedGroupCount: grouped.groups.length,
  };

  logDuplicateTruncationDiagnostics({
    organizationId,
    meta,
    elapsedMs: Date.now() - startedAt,
  });

  return {
    groups: grouped.groups,
    meta,
  };
}
