/**
 * Spreadsheet import job orchestration (draft → validate → resolve → execute → chunks).
 * Phase 1 audit trail is crm_import_jobs (org-level accountability deferred —
 * crm_accountability_events.project_id is NOT NULL and readers are project-scoped).
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  SPREADSHEET_IMPORT_CHUNK_MAX_ENTITIES,
  SPREADSHEET_IMPORT_CLAIM_TTL_MS,
  SPREADSHEET_IMPORT_MAX_COLUMNS,
  SPREADSHEET_IMPORT_MAX_NEW_CUSTOM_FIELDS,
  SPREADSHEET_IMPORT_MAX_PARENT_GROUPS,
  SPREADSHEET_IMPORT_MAX_ROWS,
} from '@/domain/crm/spreadsheetImportLimits';
import {
  collectMappedStandardCellValues,
  duplicateOrOverLimitMappingMessage,
  expandDelimitedContactValues,
  maxStandardFieldMappings,
} from '@/domain/crm/spreadsheetImportMultiValue';
import {
  normalizeContactEmails,
  normalizeContactPhones,
} from '@/domain/crm/contactMultiValue';
import {
  buildImportParentGroups,
  detectParentFieldConflicts,
  normalizeImportText,
} from '@/domain/crm/spreadsheetImportGrouping';
import {
  areParentConflictsResolved,
  buildResolvedParentAttributesForGroup,
} from '@/domain/crm/spreadsheetImportConflictResolution';
import {
  assertGroupStatusTransition,
  assertJobStatusTransition,
  assertRowStatusTransition,
} from '@/domain/crm/spreadsheetImportStatus';
import type {
  CrmImportColumnMapping,
  CrmImportIssue,
  CrmImportJobCounts,
  CrmImportMode,
  CrmImportParentResolution,
  CrmImportParsedRow,
  CrmImportResolvedParentAttributes,
} from '@/domain/crm/spreadsheetImportTypes';
import { EMPTY_CRM_IMPORT_JOB_COUNTS } from '@/domain/crm/spreadsheetImportTypes';
import type { ImportDuplicateCheckSnapshot } from '@/domain/crm/importDuplicateDecisions';
import {
  getSubprojectNameFromRow,
  validateImportRow,
  escapeCsvCell,
} from '@/domain/crm/spreadsheetImportValidation';
import { getFirstPipelineStageSlug } from '@/domain/crm/pipelineStage';
import { createProjectCustomFieldDefinitionForOrg } from '@/infrastructure/crm/server/buildCoreProjectCustomFieldService';
import { listProjectCustomFieldDefinitionsForOrg } from '@/infrastructure/crm/server/buildCoreProjectCustomFieldService';
import {
  assertParentProjectExistsForOrg,
  createCrmProjectForImportBulk,
  type CrmImportProjectWriteInput,
} from '@/infrastructure/crm/server/crmCreateService';
import { loadOrganizationPipelineStageCatalog } from '@/infrastructure/crm/server/pipelineStageService';
import { parseImportDealValueToCents } from '@/domain/crm/spreadsheetImportValidation';
import { pipelineStageSlugSet } from '@/domain/crm';

async function loadOrgMemberEmailToIdMap(
  supabase: SupabaseClient,
  organizationId: string
): Promise<Map<string, string>> {
  const { data: members } = await supabase
    .from('platform_organization_members')
    .select('user_id')
    .eq('organization_id', organizationId)
    .eq('membership_status', 'active');
  const memberIds = ((members ?? []) as { user_id: string }[]).map((m) => m.user_id);
  const memberEmailToId = new Map<string, string>();
  if (memberIds.length === 0) return memberEmailToId;

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email')
    .in('id', memberIds);
  for (const p of (profiles ?? []) as { id: string; email: string | null }[]) {
    if (p.email) memberEmailToId.set(normalizeImportText(p.email), p.id);
  }
  return memberEmailToId;
}

function collectImportMappingErrors(
  mappings: readonly CrmImportColumnMapping[],
  importMode: CrmImportMode
): string[] {
  const errors: string[] = [];
  const hasSubprojectName = mappings.some(
    (m) =>
      m.destination.kind === 'standard_field' && m.destination.key === 'subproject_name'
  );
  if (!hasSubprojectName) {
    errors.push('A subproject name column mapping is required.');
  }

  if (importMode === 'master_hierarchy') {
    const hasParentKey = mappings.some(
      (m) =>
        m.destination.kind === 'standard_field' &&
        (m.destination.key === 'parent_name' || m.destination.key === 'parent_identifier')
    );
    if (!hasParentKey) {
      errors.push(
        'Master hierarchy imports require a parent name or parent identifier column.'
      );
    }
  }

  const standardCounts = new Map<string, number>();
  for (const mapping of mappings) {
    if (mapping.destination.kind !== 'standard_field') continue;
    const fieldKey = mapping.destination.key;
    const countKey = `${mapping.destination.entity}:${fieldKey}`;
    const count = (standardCounts.get(countKey) ?? 0) + 1;
    standardCounts.set(countKey, count);
    const max = maxStandardFieldMappings(fieldKey);
    if (count === max + 1) {
      errors.push(duplicateOrOverLimitMappingMessage(fieldKey, max));
    }
  }

  return errors;
}

function mappingCell(
  row: CrmImportParsedRow,
  mappings: readonly CrmImportColumnMapping[],
  key: string
): string {
  const col = mappings.find(
    (m) => m.destination.kind === 'standard_field' && m.destination.key === key
  );
  if (col == null) return '';
  return (row.cells[col.sourceIndex] ?? '').trim();
}

function buildWriteInputFromRow(input: {
  readonly name: string;
  readonly parentProjectId: string | null;
  readonly row: CrmImportParsedRow;
  readonly mappings: readonly CrmImportColumnMapping[];
  readonly defaultStage: string;
  readonly memberEmailToId: ReadonlyMap<string, string>;
  readonly customFieldValues: Record<string, string | null>;
}): CrmImportProjectWriteInput {
  const contactName = mappingCell(input.row, input.mappings, 'contact_name') || null;
  const emails = normalizeContactEmails(
    expandDelimitedContactValues(
      collectMappedStandardCellValues(input.row, input.mappings, 'emails')
    )
  );
  const phones = normalizeContactPhones(
    expandDelimitedContactValues(
      collectMappedStandardCellValues(input.row, input.mappings, 'phones')
    )
  );
  const dealRaw = mappingCell(input.row, input.mappings, 'deal_value');
  const dealParsed = dealRaw ? parseImportDealValueToCents(dealRaw) : { ok: true as const, cents: 0 };
  const assigneeEmail = mappingCell(input.row, input.mappings, 'assignee_email');
  const assignedMemberId =
    assigneeEmail && input.memberEmailToId.has(normalizeImportText(assigneeEmail))
      ? input.memberEmailToId.get(normalizeImportText(assigneeEmail))!
      : null;
  const stageRaw = mappingCell(input.row, input.mappings, 'stage');

  return {
    name: input.name,
    industry: 'hvac',
    customIndustry: null,
    contactName,
    emails,
    phones,
    priority: 'normal',
    currentStageSlug: (stageRaw || input.defaultStage) as CrmImportProjectWriteInput['currentStageSlug'],
    notes: mappingCell(input.row, input.mappings, 'notes') || null,
    dealValueCents: dealParsed.ok ? dealParsed.cents : 0,
    balanceRemainingCents: 0,
    assignedMemberId,
    addressLine1: mappingCell(input.row, input.mappings, 'address_line_1') || null,
    addressLine2: mappingCell(input.row, input.mappings, 'address_line_2') || null,
    city: mappingCell(input.row, input.mappings, 'city') || null,
    state: mappingCell(input.row, input.mappings, 'state') || null,
    postalCode: mappingCell(input.row, input.mappings, 'postal_code') || null,
    latitude: null,
    longitude: null,
    parentProjectId: input.parentProjectId,
    customFieldValues: input.customFieldValues,
  };
}

function collectCustomFieldValuesForRow(
  row: CrmImportParsedRow,
  mappings: readonly CrmImportColumnMapping[],
  entityScope: 'project' | 'subproject',
  fieldKeyByColumn: ReadonlyMap<number, string>
): Record<string, string | null> {
  const out: Record<string, string | null> = {};
  for (const mapping of mappings) {
    if (mapping.destination.kind === 'ignored') continue;
    let scope: 'project' | 'subproject' | null = null;
    if (
      mapping.destination.kind === 'existing_custom_field' ||
      mapping.destination.kind === 'new_custom_field'
    ) {
      scope = mapping.destination.scope;
    }
    if (scope !== entityScope) continue;
    const key = fieldKeyByColumn.get(mapping.sourceIndex);
    if (key == null) continue;
    const raw = (row.cells[mapping.sourceIndex] ?? '').trim();
    out[key] = raw || null;
  }
  return out;
}

export type CreateImportDraftInput = {
  readonly importMode: CrmImportMode;
  readonly fixedParentProjectId?: string | null;
  readonly fixedParentDisplayName?: string | null;
  readonly sourceFilename: string;
  readonly sheetName: string;
  readonly headerRowIndex: number;
  readonly idempotencyKey: string;
  readonly mappings: readonly CrmImportColumnMapping[];
  readonly rows: readonly CrmImportParsedRow[];
  readonly duplicateCheck?: ImportDuplicateCheckSnapshot | null;
};

export async function createSpreadsheetImportDraft(
  supabase: SupabaseClient,
  organizationId: string,
  actorUserId: string,
  input: CreateImportDraftInput
): Promise<{ readonly jobId: string; readonly status: 'draft' | 'ready' }> {
  if (input.rows.length === 0) throw new Error('At least one data row is required.');
  if (input.rows.length > SPREADSHEET_IMPORT_MAX_ROWS) {
    throw new Error(`At most ${SPREADSHEET_IMPORT_MAX_ROWS} rows are allowed.`);
  }
  if (input.mappings.length > SPREADSHEET_IMPORT_MAX_COLUMNS) {
    throw new Error(`At most ${SPREADSHEET_IMPORT_MAX_COLUMNS} columns are allowed.`);
  }

  const newCfCount = input.mappings.filter((m) => m.destination.kind === 'new_custom_field').length;
  if (newCfCount > SPREADSHEET_IMPORT_MAX_NEW_CUSTOM_FIELDS) {
    throw new Error(
      `At most ${SPREADSHEET_IMPORT_MAX_NEW_CUSTOM_FIELDS} new custom fields per import.`
    );
  }

  if (input.importMode === 'into_existing_parent') {
    if (!input.fixedParentProjectId) throw new Error('fixedParentProjectId is required.');
    await assertParentProjectExistsForOrg(supabase, organizationId, input.fixedParentProjectId);
  }

  const groups = buildImportParentGroups({
    mode: input.importMode,
    fixedParentProjectId: input.fixedParentProjectId,
    fixedParentDisplayName: input.fixedParentDisplayName,
    mappings: input.mappings,
    rows: input.rows,
  });

  if (groups.length > SPREADSHEET_IMPORT_MAX_PARENT_GROUPS) {
    throw new Error(`At most ${SPREADSHEET_IMPORT_MAX_PARENT_GROUPS} parent groups are allowed.`);
  }

  const { data: existing } = await supabase
    .from('crm_import_jobs')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('idempotency_key', input.idempotencyKey)
    .maybeSingle();
  if (existing?.id) {
    const { data: existingJob } = await supabase
      .from('crm_import_jobs')
      .select('status')
      .eq('id', existing.id)
      .single();
    const status = (existingJob?.status as 'draft' | 'ready' | undefined) ?? 'draft';
    return {
      jobId: existing.id as string,
      status: status === 'ready' ? 'ready' : 'draft',
    };
  }

  const { data: job, error: jobError } = await supabase
    .from('crm_import_jobs')
    .insert({
      organization_id: organizationId,
      actor_user_id: actorUserId,
      import_mode: input.importMode,
      fixed_parent_project_id: input.fixedParentProjectId ?? null,
      source_filename: input.sourceFilename,
      sheet_name: input.sheetName,
      header_row_index: input.headerRowIndex,
      mapping_snapshot: {
        mappings: input.mappings,
        rows: input.rows,
        ...(input.duplicateCheck != null ? { duplicateCheck: input.duplicateCheck } : {}),
      },
      status: 'draft',
      idempotency_key: input.idempotencyKey,
      counts: EMPTY_CRM_IMPORT_JOB_COUNTS,
    })
    .select('id')
    .single();

  if (jobError || job == null) {
    throw new Error(jobError?.message ?? 'Failed to create import job.');
  }

  const jobId = job.id as string;
  const groupIdByKey = new Map<string, string>();

  for (let i = 0; i < groups.length; i += 1) {
    const g = groups[i];
    const groupRows = input.rows.filter((r) => g.sourceRowIndexes.includes(r.sourceRowIndex));
    const conflicts =
      input.importMode === 'master_hierarchy' && g.kind !== 'unassigned' && g.kind !== 'fixed'
        ? detectParentFieldConflicts({ mappings: input.mappings, rows: groupRows })
        : [];

    const status =
      input.importMode === 'into_existing_parent'
        ? 'ready'
        : g.kind === 'unassigned'
          ? 'unresolved'
          : conflicts.length > 0
            ? 'unresolved'
            : 'unresolved';

    const { data: groupRow, error: groupError } = await supabase
      .from('crm_import_parent_groups')
      .insert({
        job_id: jobId,
        organization_id: organizationId,
        group_key: g.groupKey,
        raw_identifier: g.rawIdentifier,
        display_parent_name: g.displayParentName,
        resolution_type:
          input.importMode === 'into_existing_parent' ? 'attach_existing' : null,
        existing_parent_project_id:
          input.importMode === 'into_existing_parent' ? input.fixedParentProjectId : null,
        conflict_state: { conflicts },
        resolved_parent_attributes: {},
        status,
        sort_order: i,
      })
      .select('id')
      .single();

    if (groupError || groupRow == null) {
      throw new Error(groupError?.message ?? 'Failed to create import group.');
    }
    groupIdByKey.set(g.groupKey, groupRow.id as string);
  }

  const rowInserts = input.rows.map((row) => {
    const group = groups.find((g) => g.sourceRowIndexes.includes(row.sourceRowIndex));
    const parentGroupId = groupIdByKey.get(group?.groupKey ?? 'unassigned');
    if (parentGroupId == null) throw new Error('Missing parent group for row.');
    const name = getSubprojectNameFromRow(row, input.mappings);
    return {
      job_id: jobId,
      organization_id: organizationId,
      parent_group_id: parentGroupId,
      source_row_index: row.sourceRowIndex,
      status: name ? 'pending' : 'invalid',
      excluded: false,
      error_codes: name ? [] : ['missing_subproject_name'],
      error_message: name ? null : 'Subproject name is required.',
      dedupe_fingerprint: {
        name: normalizeImportText(name),
        groupKey: group?.groupKey ?? 'unassigned',
      },
      warning_codes: [],
    };
  });

  // Insert in chunks of 200
  for (let i = 0; i < rowInserts.length; i += 200) {
    const slice = rowInserts.slice(i, i + 200);
    const { error } = await supabase.from('crm_import_job_rows').insert(slice);
    if (error) throw new Error(error.message);
  }

  let jobStatus: 'draft' | 'ready' = 'draft';
  if (input.importMode === 'into_existing_parent') {
    jobStatus = 'ready';
    assertJobStatusTransition('draft', 'ready');
    await supabase.from('crm_import_jobs').update({ status: 'ready' }).eq('id', jobId);
  }

  return { jobId, status: jobStatus };
}

export async function saveImportResolutions(
  supabase: SupabaseClient,
  organizationId: string,
  jobId: string,
  resolutions: readonly {
    readonly groupKey: string;
    readonly resolution: CrmImportParentResolution;
  }[],
  excludedSourceRowIndexes: readonly number[] = [],
  options: {
    readonly duplicateCheck?: ImportDuplicateCheckSnapshot | null;
    readonly duplicateSkipSourceRowIndexes?: readonly number[];
  } = {}
): Promise<{
  readonly status: 'draft' | 'ready';
  readonly blockingGroupKeys: readonly string[];
}> {
  const { data: job } = await supabase
    .from('crm_import_jobs')
    .select('id, status, import_mode, organization_id, mapping_snapshot')
    .eq('id', jobId)
    .eq('organization_id', organizationId)
    .maybeSingle();
  if (job == null) throw new Error('Import job not found.');
  if (job.status !== 'draft' && job.status !== 'ready') {
    throw new Error('Import job cannot be modified in its current status.');
  }

  const snapshot = job.mapping_snapshot as {
    mappings?: CrmImportColumnMapping[];
    rows?: CrmImportParsedRow[];
  };
  const mappings = snapshot.mappings ?? [];
  const allRows = snapshot.rows ?? [];
  const importMode = job.import_mode as CrmImportMode;

  for (const item of resolutions) {
    const { data: group } = await supabase
      .from('crm_import_parent_groups')
      .select('id, status, group_key, conflict_state, display_parent_name')
      .eq('job_id', jobId)
      .eq('group_key', item.groupKey)
      .maybeSingle();
    if (group == null) continue;

    if (item.resolution.type === 'ignore') {
      assertGroupStatusTransition(group.status as never, 'ignored');
      await supabase
        .from('crm_import_parent_groups')
        .update({
          resolution_type: 'ignore',
          status: 'ignored',
          existing_parent_project_id: null,
          created_parent_project_id: null,
          resolved_parent_attributes: {},
          conflict_state: { conflicts: [], resolutions: {} },
        })
        .eq('id', group.id);
      await supabase
        .from('crm_import_job_rows')
        .update({ status: 'excluded', excluded: true })
        .eq('parent_group_id', group.id)
        .eq('status', 'pending');
      continue;
    }

    if (item.resolution.type === 'attach_existing') {
      await assertParentProjectExistsForOrg(
        supabase,
        organizationId,
        item.resolution.projectId
      );
      // Attach never overwrites parent fields — clear any create_new conflict drafts.
      assertGroupStatusTransition(group.status as never, 'ready');
      await supabase
        .from('crm_import_parent_groups')
        .update({
          resolution_type: 'attach_existing',
          status: 'ready',
          existing_parent_project_id: item.resolution.projectId,
          resolved_parent_attributes: {},
          conflict_state: {
            ...((group.conflict_state as object) ?? {}),
            resolutions: {},
          },
        })
        .eq('id', group.id);
      continue;
    }

    // create_new — field-level conflicts must be resolved before ready
    const builtGroups = buildImportParentGroups({
      mode: importMode,
      mappings,
      rows: allRows,
    });
    const built = builtGroups.find((g) => g.groupKey === item.groupKey);
    const groupRows =
      built != null
        ? allRows.filter((r) => built.sourceRowIndexes.includes(r.sourceRowIndex))
        : [];
    const conflicts =
      importMode === 'master_hierarchy'
        ? detectParentFieldConflicts({ mappings, rows: groupRows })
        : [];

    const conflictResolutions = item.resolution.conflictResolutions ?? {};
    const builtAttrs = buildResolvedParentAttributesForGroup({
      displayParentName:
        item.resolution.parentAttributes.name ||
        (group.display_parent_name as string) ||
        'Imported project',
      mappings,
      rows: groupRows,
      conflicts,
      conflictResolutions,
    });

    if (!builtAttrs.ok || !areParentConflictsResolved(conflicts, conflictResolutions)) {
      await supabase
        .from('crm_import_parent_groups')
        .update({
          resolution_type: 'create_new',
          status: 'unresolved',
          existing_parent_project_id: null,
          resolved_parent_attributes: item.resolution.parentAttributes,
          conflict_state: {
            conflicts,
            resolutions: conflictResolutions,
          },
          display_parent_name:
            item.resolution.parentAttributes.name || (group.display_parent_name as string),
        })
        .eq('id', group.id);
      continue;
    }

    // Prefer server-built attributes so create uses only resolved values
    const parentAttributes: CrmImportResolvedParentAttributes = {
      ...builtAttrs.attributes,
      name: (item.resolution.parentAttributes.name || builtAttrs.attributes.name).trim(),
    };

    if (group.status === 'unresolved' || group.status === 'ready') {
      assertGroupStatusTransition(group.status as never, 'ready');
    }
    await supabase
      .from('crm_import_parent_groups')
      .update({
        resolution_type: 'create_new',
        status: 'ready',
        existing_parent_project_id: null,
        resolved_parent_attributes: parentAttributes,
        conflict_state: {
          conflicts,
          resolutions: conflictResolutions,
        },
        display_parent_name: parentAttributes.name,
      })
      .eq('id', group.id);
  }

  const duplicateSkipIndexes = [...(options.duplicateSkipSourceRowIndexes ?? [])];
  const duplicateSkipSet = new Set(duplicateSkipIndexes);
  const manualExcludeIndexes = excludedSourceRowIndexes.filter(
    (index) => !duplicateSkipSet.has(index)
  );

  if (manualExcludeIndexes.length > 0) {
    await supabase
      .from('crm_import_job_rows')
      .update({ status: 'excluded', excluded: true })
      .eq('job_id', jobId)
      .in('source_row_index', manualExcludeIndexes);
  }

  if (duplicateSkipIndexes.length > 0) {
    await supabase
      .from('crm_import_job_rows')
      .update({
        status: 'excluded',
        excluded: true,
        warning_codes: ['duplicate_review_skip'],
        error_message: 'Skipped during duplicate review.',
      })
      .eq('job_id', jobId)
      .in('source_row_index', [...duplicateSkipIndexes]);
  }

  if (options.duplicateCheck != null) {
    const nextSnapshot = {
      ...snapshot,
      duplicateCheck: options.duplicateCheck,
    };
    await supabase
      .from('crm_import_jobs')
      .update({ mapping_snapshot: nextSnapshot })
      .eq('id', jobId);
  }

  if (manualExcludeIndexes.length > 0 || duplicateSkipIndexes.length > 0) {
    const { count } = await supabase
      .from('crm_import_job_rows')
      .select('id', { count: 'exact', head: true })
      .eq('job_id', jobId)
      .eq('excluded', true);
    const { data: currentJob } = await supabase
      .from('crm_import_jobs')
      .select('counts')
      .eq('id', jobId)
      .maybeSingle();
    const currentCounts =
      (currentJob?.counts as CrmImportJobCounts | null) ?? EMPTY_CRM_IMPORT_JOB_COUNTS;
    await supabase
      .from('crm_import_jobs')
      .update({
        counts: {
          ...currentCounts,
          excludedRows: count ?? 0,
        },
      })
      .eq('id', jobId);
  }

  const { data: unresolved } = await supabase
    .from('crm_import_parent_groups')
    .select('id')
    .eq('job_id', jobId)
    .eq('status', 'unresolved');

  const nextStatus = (unresolved ?? []).length === 0 ? 'ready' : 'draft';
  if (job.status !== nextStatus) {
    assertJobStatusTransition(job.status as never, nextStatus);
  }
  await supabase.from('crm_import_jobs').update({ status: nextStatus }).eq('id', jobId);

  const { data: blockingGroups } = await supabase
    .from('crm_import_parent_groups')
    .select('group_key')
    .eq('job_id', jobId)
    .eq('status', 'unresolved');

  return {
    status: nextStatus,
    blockingGroupKeys: (blockingGroups ?? []).map((g) => g.group_key as string),
  };
}

export async function startImportExecution(
  supabase: SupabaseClient,
  organizationId: string,
  jobId: string,
  clientClaimToken: string
): Promise<{ readonly claimExpiresAt: string }> {
  const { data: job } = await supabase
    .from('crm_import_jobs')
    .select('*')
    .eq('id', jobId)
    .eq('organization_id', organizationId)
    .maybeSingle();
  if (job == null) throw new Error('Import job not found.');
  if (job.status !== 'ready' && job.status !== 'partially_completed') {
    throw new Error('Import job is not ready to execute.');
  }

  // Create approved new custom field definitions once
  const snapshot = job.mapping_snapshot as {
    mappings?: CrmImportColumnMapping[];
  };
  const mappings = snapshot.mappings ?? [];
  const existingDefs = await listProjectCustomFieldDefinitionsForOrg(supabase, organizationId);
  const fieldKeyByColumn = new Map<number, string>();

  let newCreated = 0;
  for (const mapping of mappings) {
    if (mapping.destination.kind === 'existing_custom_field') {
      fieldKeyByColumn.set(mapping.sourceIndex, mapping.destination.fieldKey);
      continue;
    }
    if (mapping.destination.kind !== 'new_custom_field') continue;
    const newFieldDestination = mapping.destination;
    if (newCreated >= SPREADSHEET_IMPORT_MAX_NEW_CUSTOM_FIELDS) {
      throw new Error('Too many new custom fields.');
    }
    const match = existingDefs.find(
      (d) =>
        d.scope === newFieldDestination.scope &&
        (d.fieldKey === normalizeImportText(newFieldDestination.proposedLabel).replace(/\s+/g, '_') ||
          normalizeImportText(d.label) === normalizeImportText(newFieldDestination.proposedLabel))
    );
    if (match != null) {
      fieldKeyByColumn.set(mapping.sourceIndex, match.fieldKey);
      continue;
    }
    const created = await createProjectCustomFieldDefinitionForOrg(supabase, organizationId, {
      label: newFieldDestination.proposedLabel,
      scope: newFieldDestination.scope,
      fieldType: 'text',
      source: 'import',
    });
    fieldKeyByColumn.set(mapping.sourceIndex, created.fieldKey);
    newCreated += 1;
  }

  const claimExpiresAt = new Date(Date.now() + SPREADSHEET_IMPORT_CLAIM_TTL_MS).toISOString();
  assertJobStatusTransition(job.status as never, 'running');
  await supabase
    .from('crm_import_jobs')
    .update({
      status: 'running',
      claim_owner: clientClaimToken,
      claim_expires_at: claimExpiresAt,
      execution_cursor: {
        ...(typeof job.execution_cursor === 'object' && job.execution_cursor != null
          ? job.execution_cursor
          : {}),
        fieldKeyByColumn: Object.fromEntries(fieldKeyByColumn),
      },
    })
    .eq('id', jobId);

  return { claimExpiresAt };
}

export async function processImportNextChunk(
  supabase: SupabaseClient,
  organizationId: string,
  actorUserId: string,
  jobId: string,
  clientClaimToken: string
): Promise<{
  readonly done: boolean;
  readonly status: string;
  readonly processedEntities: number;
  readonly counts: CrmImportJobCounts;
  readonly transitionedToTerminal: boolean;
}> {
  const { data: job } = await supabase
    .from('crm_import_jobs')
    .select('*')
    .eq('id', jobId)
    .eq('organization_id', organizationId)
    .maybeSingle();
  if (job == null) throw new Error('Import job not found.');
  if (job.status === 'completed' || job.status === 'cancelled' || job.status === 'failed') {
    return {
      done: true,
      status: job.status,
      processedEntities: 0,
      counts: (job.counts as CrmImportJobCounts) ?? EMPTY_CRM_IMPORT_JOB_COUNTS,
      transitionedToTerminal: false,
    };
  }
  if (job.status !== 'running' && job.status !== 'partially_completed') {
    throw new Error('Import job is not running.');
  }
  if (job.claim_owner != null && job.claim_owner !== clientClaimToken) {
    const expired =
      job.claim_expires_at == null || new Date(job.claim_expires_at).getTime() < Date.now();
    if (!expired) {
      throw new Error('Import job is claimed by another session.');
    }
  }

  const claimExpiresAt = new Date(Date.now() + SPREADSHEET_IMPORT_CLAIM_TTL_MS).toISOString();
  await supabase
    .from('crm_import_jobs')
    .update({ claim_owner: clientClaimToken, claim_expires_at: claimExpiresAt, status: 'running' })
    .eq('id', jobId);

  const snapshot = job.mapping_snapshot as {
    mappings?: CrmImportColumnMapping[];
    rows?: CrmImportParsedRow[];
  };
  const mappings = snapshot.mappings ?? [];
  const allRows = snapshot.rows ?? [];
  const cursor = (job.execution_cursor ?? {}) as {
    fieldKeyByColumn?: Record<string, string>;
  };
  const fieldKeyByColumn = new Map<number, string>(
    Object.entries(cursor.fieldKeyByColumn ?? {}).map(([k, v]) => [Number(k), v])
  );

  const stageCatalog = await loadOrganizationPipelineStageCatalog(
    supabase,
    organizationId,
    'subproject'
  );
  const defaultStage = getFirstPipelineStageSlug(stageCatalog);
  const parentStageCatalog = await loadOrganizationPipelineStageCatalog(
    supabase,
    organizationId,
    'project'
  );
  const defaultParentStage = getFirstPipelineStageSlug(parentStageCatalog);

  const memberEmailToId = await loadOrgMemberEmailToIdMap(supabase, organizationId);

  const { data: readyGroups } = await supabase
    .from('crm_import_parent_groups')
    .select('*')
    .eq('job_id', jobId)
    .in('status', ['ready', 'running', 'partially_completed'])
    .order('sort_order', { ascending: true });

  let processed = 0;
  const counts = {
    ...EMPTY_CRM_IMPORT_JOB_COUNTS,
    ...((job.counts as Partial<CrmImportJobCounts>) ?? {}),
  };

  for (const group of readyGroups ?? []) {
    if (processed >= SPREADSHEET_IMPORT_CHUNK_MAX_ENTITIES) break;

    if (group.status === 'ready') {
      assertGroupStatusTransition('ready', 'running');
      await supabase
        .from('crm_import_parent_groups')
        .update({ status: 'running' })
        .eq('id', group.id);
    }

    let parentId: string | null =
      (group.created_parent_project_id as string | null) ??
      (group.existing_parent_project_id as string | null);

    // Create parent if needed and at least one valid pending child exists
    if (
      group.resolution_type === 'create_new' &&
      group.created_parent_project_id == null
    ) {
      const { count: pendingCount } = await supabase
        .from('crm_import_job_rows')
        .select('id', { count: 'exact', head: true })
        .eq('parent_group_id', group.id)
        .eq('status', 'pending')
        .eq('excluded', false);

      if ((pendingCount ?? 0) === 0) {
        await supabase
          .from('crm_import_parent_groups')
          .update({ status: 'failed', error_summary: 'No valid child rows.' })
          .eq('id', group.id);
        counts.failedGroups += 1;
        continue;
      }

      const attrs = (group.resolved_parent_attributes ??
        {}) as CrmImportResolvedParentAttributes;
      const parentName = attrs.name?.trim() || (group.display_parent_name as string);
      const created = await createCrmProjectForImportBulk(supabase, organizationId, {
        name: parentName,
        industry: 'hvac',
        customIndustry: null,
        contactName: attrs.contactName ?? null,
        emails: attrs.emails ? [...attrs.emails] : [],
        phones: attrs.phones ? [...attrs.phones] : [],
        priority: 'normal',
        currentStageSlug: (attrs.currentStageSlug as never) || defaultParentStage,
        notes: attrs.notes ?? null,
        dealValueCents: attrs.dealValueCents ?? 0,
        balanceRemainingCents: 0,
        assignedMemberId: attrs.assignedMemberId ?? null,
        addressLine1: attrs.addressLine1 ?? null,
        addressLine2: attrs.addressLine2 ?? null,
        city: attrs.city ?? null,
        state: attrs.state ?? null,
        postalCode: attrs.postalCode ?? null,
        latitude: null,
        longitude: null,
        parentProjectId: null,
        customFieldValues: attrs.customFieldValues ?? {},
      });
      parentId = created.id;
      counts.createdParents += 1;
      await supabase
        .from('crm_import_parent_groups')
        .update({ created_parent_project_id: created.id })
        .eq('id', group.id);
      processed += 1;
      if (processed >= SPREADSHEET_IMPORT_CHUNK_MAX_ENTITIES) break;
    }

    if (group.resolution_type === 'attach_existing' && parentId) {
      // count once when first used
      if (group.status === 'ready' || group.status === 'running') {
        /* existingParentsUsed incremented once per group on first child success below */
      }
    }

    if (parentId == null) {
      await supabase
        .from('crm_import_parent_groups')
        .update({ status: 'failed', error_summary: 'Parent project missing.' })
        .eq('id', group.id);
      counts.failedGroups += 1;
      continue;
    }

    const { data: pendingRows } = await supabase
      .from('crm_import_job_rows')
      .select('*')
      .eq('parent_group_id', group.id)
      .eq('status', 'pending')
      .eq('excluded', false)
      .order('source_row_index', { ascending: true })
      .limit(SPREADSHEET_IMPORT_CHUNK_MAX_ENTITIES - processed);

    let groupHadSuccess = false;
    const succeededNameNorms = new Set<string>();
    // Preload already-succeeded names in this group for duplicate warnings
    {
      const { data: succeededRows } = await supabase
        .from('crm_import_job_rows')
        .select('source_row_index')
        .eq('parent_group_id', group.id)
        .eq('status', 'succeeded');
      for (const sr of succeededRows ?? []) {
        const src = allRows.find((r) => r.sourceRowIndex === sr.source_row_index);
        if (src == null) continue;
        const n = getSubprojectNameFromRow(src, mappings);
        if (n) succeededNameNorms.add(normalizeImportText(n));
      }
    }

    for (const row of pendingRows ?? []) {
      if (processed >= SPREADSHEET_IMPORT_CHUNK_MAX_ENTITIES) break;
      const source = allRows.find((r) => r.sourceRowIndex === row.source_row_index);
      if (source == null) {
        await supabase
          .from('crm_import_job_rows')
          .update({
            status: 'failed',
            error_codes: ['missing_source'],
            error_message: 'Source row payload missing.',
          })
          .eq('id', row.id);
        counts.failedRows += 1;
        processed += 1;
        continue;
      }

      const validation = validateImportRow({
        row: source,
        mappings,
        memberEmailToId,
        duplicateNamesInGroup: succeededNameNorms,
      });
      if (!validation.ok) {
        await supabase
          .from('crm_import_job_rows')
          .update({
            status: 'invalid',
            error_codes: validation.issues.filter((i) => i.severity === 'error').map((i) => i.code),
            warning_codes: validation.issues
              .filter((i) => i.severity === 'warning')
              .map((i) => i.code),
            error_message: validation.issues.find((i) => i.severity === 'error')?.message ?? null,
          })
          .eq('id', row.id);
        counts.invalidRows += 1;
        processed += 1;
        continue;
      }

      assertRowStatusTransition('pending', 'running');
      await supabase.from('crm_import_job_rows').update({ status: 'running' }).eq('id', row.id);

      try {
        const cfValues = collectCustomFieldValuesForRow(
          source,
          mappings,
          'subproject',
          fieldKeyByColumn
        );
        const write = buildWriteInputFromRow({
          name: validation.subprojectName,
          parentProjectId: parentId,
          row: source,
          mappings,
          defaultStage,
          memberEmailToId,
          customFieldValues: cfValues,
        });
        const created = await createCrmProjectForImportBulk(supabase, organizationId, write);
        assertRowStatusTransition('running', 'succeeded');
        await supabase
          .from('crm_import_job_rows')
          .update({
            status: 'succeeded',
            created_subproject_id: created.id,
            warning_codes: validation.issues
              .filter((i) => i.severity === 'warning')
              .map((i) => i.code),
          })
          .eq('id', row.id);
        counts.createdSubprojects += 1;
        counts.warningCount += validation.issues.filter((i) => i.severity === 'warning').length;
        groupHadSuccess = true;
        if (validation.subprojectName) {
          succeededNameNorms.add(normalizeImportText(validation.subprojectName));
        }
      } catch (err) {
        assertRowStatusTransition('running', 'failed');
        await supabase
          .from('crm_import_job_rows')
          .update({
            status: 'failed',
            error_codes: ['create_failed'],
            error_message: err instanceof Error ? err.message : 'Create failed.',
          })
          .eq('id', row.id);
        counts.failedRows += 1;
      }
      processed += 1;
    }

    if (group.resolution_type === 'attach_existing' && groupHadSuccess) {
      // Increment existing parents used at most once — stored via flag in attributes
      const attrs = (group.resolved_parent_attributes ?? {}) as Record<string, unknown>;
      if (attrs.countedExisting !== true) {
        counts.existingParentsUsed += 1;
        await supabase
          .from('crm_import_parent_groups')
          .update({
            resolved_parent_attributes: { ...attrs, countedExisting: true },
          })
          .eq('id', group.id);
      }
    }

    const { count: stillPending } = await supabase
      .from('crm_import_job_rows')
      .select('id', { count: 'exact', head: true })
      .eq('parent_group_id', group.id)
      .eq('status', 'pending');

    if ((stillPending ?? 0) === 0) {
      const { count: failedInGroup } = await supabase
        .from('crm_import_job_rows')
        .select('id', { count: 'exact', head: true })
        .eq('parent_group_id', group.id)
        .in('status', ['failed', 'invalid']);
      const { count: succeededInGroup } = await supabase
        .from('crm_import_job_rows')
        .select('id', { count: 'exact', head: true })
        .eq('parent_group_id', group.id)
        .eq('status', 'succeeded');

      let nextGroupStatus: 'completed' | 'partially_completed' | 'failed' = 'completed';
      if ((succeededInGroup ?? 0) === 0 && (failedInGroup ?? 0) > 0) nextGroupStatus = 'failed';
      else if ((failedInGroup ?? 0) > 0) nextGroupStatus = 'partially_completed';

      await supabase
        .from('crm_import_parent_groups')
        .update({ status: nextGroupStatus })
        .eq('id', group.id);
    } else {
      await supabase
        .from('crm_import_parent_groups')
        .update({ status: 'partially_completed' })
        .eq('id', group.id);
    }
  }

  // Determine job completion
  const { count: openGroups } = await supabase
    .from('crm_import_parent_groups')
    .select('id', { count: 'exact', head: true })
    .eq('job_id', jobId)
    .in('status', ['ready', 'running', 'partially_completed', 'unresolved']);

  const { count: pendingRows } = await supabase
    .from('crm_import_job_rows')
    .select('id', { count: 'exact', head: true })
    .eq('job_id', jobId)
    .eq('status', 'pending');

  let nextJobStatus = job.status as string;
  let done = false;
  let transitionedToTerminal = false;
  if ((openGroups ?? 0) === 0 && (pendingRows ?? 0) === 0) {
    nextJobStatus =
      counts.failedRows > 0 || counts.invalidRows > 0 ? 'partially_completed' : 'completed';
    if (counts.createdSubprojects === 0 && counts.createdParents === 0) {
      nextJobStatus = counts.failedRows > 0 || counts.invalidRows > 0 ? 'failed' : 'completed';
    }
    // If we had successes and failures, partially_completed; if only successes, completed
    if (counts.createdSubprojects > 0 && (counts.failedRows > 0 || counts.invalidRows > 0)) {
      nextJobStatus = 'partially_completed';
    } else if (counts.createdSubprojects > 0) {
      nextJobStatus = 'completed';
    }
    done = true;
    transitionedToTerminal = true;
  } else if (processed === 0) {
    // Nothing runnable in this chunk. Finish the job so the client cannot spin forever
    // (e.g. all groups failed / unresolved while pending rows remain).
    nextJobStatus =
      counts.createdSubprojects > 0 || counts.createdParents > 0
        ? 'partially_completed'
        : 'failed';
    done = true;
    transitionedToTerminal = true;
  } else {
    nextJobStatus = 'running';
  }

  void actorUserId; // reserved for future org-level accountability

  await supabase
    .from('crm_import_jobs')
    .update({
      status: nextJobStatus,
      counts,
      claim_expires_at: claimExpiresAt,
    })
    .eq('id', jobId);

  return {
    done,
    status: nextJobStatus,
    processedEntities: processed,
    counts,
    transitionedToTerminal,
  };
}

export async function cancelImportJob(
  supabase: SupabaseClient,
  organizationId: string,
  jobId: string
): Promise<void> {
  const { data: job } = await supabase
    .from('crm_import_jobs')
    .select('status')
    .eq('id', jobId)
    .eq('organization_id', organizationId)
    .maybeSingle();
  if (job == null) throw new Error('Import job not found.');
  assertJobStatusTransition(job.status as never, 'cancelled');
  await supabase.from('crm_import_jobs').update({ status: 'cancelled' }).eq('id', jobId);
}

export async function buildImportErrorCsv(
  supabase: SupabaseClient,
  organizationId: string,
  jobId: string
): Promise<string> {
  const { data: job } = await supabase
    .from('crm_import_jobs')
    .select('sheet_name, mapping_snapshot')
    .eq('id', jobId)
    .eq('organization_id', organizationId)
    .maybeSingle();
  if (job == null) throw new Error('Import job not found.');

  const { data: rows } = await supabase
    .from('crm_import_job_rows')
    .select('*, crm_import_parent_groups(group_key, display_parent_name, resolution_type)')
    .eq('job_id', jobId)
    .in('status', ['failed', 'invalid', 'excluded'])
    .order('source_row_index', { ascending: true });

  const header = [
    'Source Sheet',
    'Source Row Number',
    'Parent Group',
    'Parent Resolution',
    'Subproject Name',
    'Status',
    'Field',
    'Error Code',
    'Error Message',
    'Warning Codes',
  ];

  const snapshot = job.mapping_snapshot as {
    mappings?: CrmImportColumnMapping[];
    rows?: CrmImportParsedRow[];
  };
  const mappings = snapshot.mappings ?? [];
  const sourceRows = snapshot.rows ?? [];

  const lines = [header.map(escapeCsvCell).join(',')];
  for (const row of rows ?? []) {
    const group = row.crm_import_parent_groups as {
      group_key?: string;
      display_parent_name?: string;
      resolution_type?: string;
    } | null;
    const source = sourceRows.find((r) => r.sourceRowIndex === row.source_row_index);
    const name = source ? getSubprojectNameFromRow(source, mappings) : '';
    lines.push(
      [
        job.sheet_name,
        String(row.source_row_index),
        group?.display_parent_name ?? group?.group_key ?? '',
        group?.resolution_type ?? '',
        name,
        row.status,
        '',
        (row.error_codes ?? []).join(';'),
        row.error_message ?? '',
        (row.warning_codes ?? []).join(';'),
      ]
        .map((c) => escapeCsvCell(String(c)))
        .join(',')
    );
  }
  return lines.join('\r\n');
}

export type CrmImportSuggestedParent = {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
};

export type CrmImportValidateGroup = {
  readonly groupKey: string;
  readonly displayName: string;
  readonly rowCount: number;
  readonly conflicts: ReturnType<typeof detectParentFieldConflicts>;
  readonly suggestedParents: readonly CrmImportSuggestedParent[];
};

export async function getSpreadsheetImportJobStatus(
  supabase: SupabaseClient,
  organizationId: string,
  jobId: string
): Promise<{
  readonly job: Record<string, unknown>;
  readonly groups: readonly Record<string, unknown>[];
  readonly counts: CrmImportJobCounts;
  readonly recentRowErrors: readonly Record<string, unknown>[];
}> {
  const { data: job } = await supabase
    .from('crm_import_jobs')
    .select('*')
    .eq('id', jobId)
    .eq('organization_id', organizationId)
    .maybeSingle();
  if (job == null) throw new Error('Import job not found.');

  const { data: groups } = await supabase
    .from('crm_import_parent_groups')
    .select('*')
    .eq('job_id', jobId)
    .order('sort_order', { ascending: true });

  const { data: recentRowErrors } = await supabase
    .from('crm_import_job_rows')
    .select('*')
    .eq('job_id', jobId)
    .in('status', ['failed', 'invalid'])
    .order('source_row_index', { ascending: true })
    .limit(50);

  return {
    job: job as Record<string, unknown>,
    groups: (groups ?? []) as Record<string, unknown>[],
    counts: (job.counts as CrmImportJobCounts) ?? EMPTY_CRM_IMPORT_JOB_COUNTS,
    recentRowErrors: (recentRowErrors ?? []) as Record<string, unknown>[],
  };
}

export async function validateSpreadsheetImportJob(
  supabase: SupabaseClient,
  organizationId: string,
  jobId: string
): Promise<{
  readonly groups: readonly CrmImportValidateGroup[];
  readonly rowIssues: readonly CrmImportIssue[];
  readonly mappingErrors: readonly string[];
}> {
  const { data: job } = await supabase
    .from('crm_import_jobs')
    .select('import_mode, fixed_parent_project_id, mapping_snapshot')
    .eq('id', jobId)
    .eq('organization_id', organizationId)
    .maybeSingle();
  if (job == null) throw new Error('Import job not found.');

  const snapshot = job.mapping_snapshot as {
    mappings?: CrmImportColumnMapping[];
    rows?: CrmImportParsedRow[];
  };
  const mappings = snapshot.mappings ?? [];
  const rows = snapshot.rows ?? [];
  const importMode = job.import_mode as CrmImportMode;

  const mappingErrors = collectImportMappingErrors(mappings, importMode);

  const builtGroups = buildImportParentGroups({
    mode: importMode,
    fixedParentProjectId: job.fixed_parent_project_id as string | null,
    mappings,
    rows,
  });

  const stageCatalog = await loadOrganizationPipelineStageCatalog(
    supabase,
    organizationId,
    'subproject'
  );
  const allowedStageSlugs = pipelineStageSlugSet(stageCatalog);
  const memberEmailToId = await loadOrgMemberEmailToIdMap(supabase, organizationId);

  const namesByGroup = new Map<string, Set<string>>();
  for (const group of builtGroups) {
    const seen = new Set<string>();
    const dups = new Set<string>();
    for (const idx of group.sourceRowIndexes) {
      const row = rows.find((r) => r.sourceRowIndex === idx);
      if (row == null) continue;
      const name = getSubprojectNameFromRow(row, mappings);
      if (!name) continue;
      const norm = normalizeImportText(name);
      if (seen.has(norm)) dups.add(norm);
      else seen.add(norm);
    }
    namesByGroup.set(group.groupKey, dups);
  }

  const rowIssues: CrmImportIssue[] = [];
  for (const row of rows) {
    const group = builtGroups.find((g) => g.sourceRowIndexes.includes(row.sourceRowIndex));
    const validation = validateImportRow({
      row,
      mappings,
      memberEmailToId,
      allowedStageSlugs,
      duplicateNamesInGroup: group != null ? namesByGroup.get(group.groupKey) : undefined,
    });
    for (const issue of validation.issues) {
      rowIssues.push(issue);
    }
  }

  let rootProjects: CrmImportSuggestedParent[] = [];
  if (importMode === 'master_hierarchy') {
    const { data: projects } = await supabase
      .from('crm_projects')
      .select('id, name, slug')
      .eq('organization_id', organizationId)
      .is('parent_project_id', null)
      .is('archived_at', null);
    rootProjects = ((projects ?? []) as { id: string; name: string; slug: string }[]).map(
      (p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
      })
    );
  }

  const groups: CrmImportValidateGroup[] = builtGroups.map((group) => {
    const groupRows = rows.filter((r) => group.sourceRowIndexes.includes(r.sourceRowIndex));
    const conflicts =
      importMode === 'master_hierarchy' && group.kind !== 'unassigned' && group.kind !== 'fixed'
        ? detectParentFieldConflicts({ mappings, rows: groupRows })
        : [];

    const normalizedDisplayName = normalizeImportText(group.displayParentName);
    const suggestedParents =
      importMode === 'master_hierarchy' && group.kind !== 'unassigned'
        ? rootProjects.filter((p) => normalizeImportText(p.name) === normalizedDisplayName)
        : [];

    return {
      groupKey: group.groupKey,
      displayName: group.displayParentName,
      rowCount: group.sourceRowIndexes.length,
      conflicts,
      suggestedParents,
    };
  });

  return { groups, rowIssues, mappingErrors };
}
