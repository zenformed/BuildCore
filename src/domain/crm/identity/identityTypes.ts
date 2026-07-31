/** Semantic class of a normalized identity value (independent of storage source). */
export const CRM_IDENTITY_VALUE_TYPES = [
  'name',
  'email',
  'phone',
  'address',
  'identity_text',
] as const;

export type CrmIdentityValueType = (typeof CRM_IDENTITY_VALUE_TYPES)[number];

/** Where a canonical identity value was taken from when indexed. */
export const CRM_IDENTITY_SOURCE_KINDS = [
  'project_name',
  'contact_name',
  'contact_email',
  'contact_phone',
  'project_address',
  'name_parts',
  'custom_field',
] as const;

export type CrmIdentitySourceKind = (typeof CRM_IDENTITY_SOURCE_KINDS)[number];

export type CrmIdentityRecordType = 'project' | 'subproject';

export type CrmIdentityValueDraft = {
  readonly valueType: CrmIdentityValueType;
  readonly normalizedValue: string;
  readonly sourceKind: CrmIdentitySourceKind;
  readonly sourceFieldKey: string | null;
  readonly sourceFieldLabel: string | null;
  readonly sourceValueId: string | null;
  /** Higher wins when collapsing duplicate (type, value) pairs. Not persisted. */
  readonly sourcePriority: number;
};

export type CrmIdentityAddressParts = {
  readonly addressLine1: string | null;
  readonly addressLine2: string | null;
  readonly city: string | null;
  readonly state: string | null;
  readonly postalCode: string | null;
};

export type CrmIdentityNameParts = {
  readonly firstName?: string | null;
  readonly lastName?: string | null;
  /** Explicit full name when already combined by the caller. */
  readonly fullName?: string | null;
};

export type CrmIdentityCustomFieldValue = {
  readonly definitionId: string;
  readonly valueId: string | null;
  readonly fieldKey: string;
  readonly label: string;
  readonly valueText: string | null;
};

/**
 * Storage-agnostic snapshot for identity extraction.
 * Builders may load this from CRM tables or from unsaved form/import payloads.
 */
export type CrmIdentityRecordSnapshot = {
  readonly organizationId: string;
  readonly recordId: string;
  readonly recordType: CrmIdentityRecordType;
  readonly projectName: string | null;
  readonly contactName: string | null;
  readonly emails: readonly string[];
  readonly phones: readonly string[];
  readonly address: CrmIdentityAddressParts;
  readonly nameParts?: CrmIdentityNameParts;
  readonly customFields: readonly CrmIdentityCustomFieldValue[];
};

export const CRM_IDENTITY_TEXT_MAX_LENGTH = 80;

/** Source priority used when collapsing identical normalized values. */
export const CRM_IDENTITY_SOURCE_PRIORITY: Readonly<Record<CrmIdentitySourceKind, number>> = {
  contact_email: 100,
  contact_phone: 100,
  contact_name: 90,
  name_parts: 85,
  custom_field: 80,
  project_name: 70,
  project_address: 70,
};
