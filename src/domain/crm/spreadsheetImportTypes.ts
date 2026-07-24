/**
 * Dual-mode spreadsheet import — domain types (Phase 1).
 */

export type CrmImportMode = 'into_existing_parent' | 'master_hierarchy';

export type CrmImportColumnOwnership = 'parent' | 'subproject' | 'ignored';

export type CrmImportDestination =
  | {
      readonly kind: 'standard_field';
      readonly entity: 'parent' | 'subproject';
      readonly key: string;
    }
  | {
      readonly kind: 'existing_custom_field';
      readonly scope: 'project' | 'subproject';
      readonly fieldKey: string;
      readonly definitionId: string;
    }
  | {
      readonly kind: 'new_custom_field';
      readonly scope: 'project' | 'subproject';
      readonly proposedLabel: string;
      readonly fieldType: 'text';
    }
  | { readonly kind: 'ignored' };

export type CrmImportColumnMapping = {
  readonly sourceIndex: number;
  readonly originalHeader: string;
  readonly ownership: CrmImportColumnOwnership;
  readonly destination: CrmImportDestination;
};

export type CrmImportJobStatus =
  | 'draft'
  | 'ready'
  | 'running'
  | 'partially_completed'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type CrmImportGroupStatus =
  | 'unresolved'
  | 'ready'
  | 'ignored'
  | 'running'
  | 'completed'
  | 'partially_completed'
  | 'failed';

export type CrmImportRowStatus =
  | 'pending'
  | 'excluded'
  | 'invalid'
  | 'running'
  | 'succeeded'
  | 'failed';

export type CrmImportParentResolutionType = 'create_new' | 'attach_existing' | 'ignore';

export type CrmImportResolvedParentAttributes = {
  readonly name: string;
  readonly industry?: string | null;
  readonly customIndustry?: string | null;
  readonly contactName?: string | null;
  readonly emails?: readonly string[];
  readonly phones?: readonly string[];
  readonly priority?: string | null;
  readonly currentStageSlug?: string | null;
  readonly notes?: string | null;
  readonly dealValueCents?: number;
  readonly assignedMemberId?: string | null;
  readonly addressLine1?: string | null;
  readonly addressLine2?: string | null;
  readonly city?: string | null;
  readonly state?: string | null;
  readonly postalCode?: string | null;
  readonly customFieldValues?: Readonly<Record<string, string | null>>;
  readonly parentIdentifierValue?: string | null;
};

export type CrmImportParentResolution =
  | {
      readonly type: 'create_new';
      readonly parentAttributes: CrmImportResolvedParentAttributes;
      /** Explicit per-field conflict choices; persisted in conflict_state.resolutions. */
      readonly conflictResolutions?: Readonly<
        Record<
          string,
          | { readonly kind: 'choose_existing'; readonly value: string }
          | { readonly kind: 'replacement'; readonly value: string }
        >
      >;
    }
  | { readonly type: 'attach_existing'; readonly projectId: string }
  | { readonly type: 'ignore' };

export type CrmImportIssueSeverity = 'error' | 'warning' | 'info';

export type CrmImportIssue = {
  readonly severity: CrmImportIssueSeverity;
  readonly code: string;
  readonly message: string;
  readonly field?: string;
  readonly sourceRowIndex?: number;
  readonly groupKey?: string;
};

/** Parsed cell map: source column index → string value. */
export type CrmImportParsedRow = {
  readonly sourceRowIndex: number;
  readonly cells: Readonly<Record<number, string>>;
};

export type CrmImportJobCounts = {
  readonly createdParents: number;
  readonly existingParentsUsed: number;
  readonly createdSubprojects: number;
  readonly failedRows: number;
  readonly excludedRows: number;
  readonly invalidRows: number;
  readonly warningCount: number;
  readonly failedGroups: number;
  readonly ignoredGroups: number;
};

export const EMPTY_CRM_IMPORT_JOB_COUNTS: CrmImportJobCounts = {
  createdParents: 0,
  existingParentsUsed: 0,
  createdSubprojects: 0,
  failedRows: 0,
  excludedRows: 0,
  invalidRows: 0,
  warningCount: 0,
  failedGroups: 0,
  ignoredGroups: 0,
};

/** Logical standard field keys used in mapping. */
export const CRM_IMPORT_STANDARD_FIELD_KEYS = [
  'parent_name',
  'parent_identifier',
  'subproject_name',
  'contact_name',
  'emails',
  'phones',
  'industry',
  'custom_industry',
  'priority',
  'stage',
  'notes',
  'deal_value',
  'assignee_email',
  'address_line_1',
  'address_line_2',
  'city',
  'state',
  'postal_code',
] as const;

export type CrmImportStandardFieldKey = (typeof CRM_IMPORT_STANDARD_FIELD_KEYS)[number];
