import {
  CRM_DUPLICATE_DETECTION_LIMITS,
  isCrmDuplicateConfidence,
  type CrmDuplicateConfidence,
} from '@/domain/crm/identity/duplicateCandidateTypes';
import type { CrmIdentityCustomFieldValue, CrmIdentityRecordType } from '@/domain/crm/identity';
import type {
  CrmDuplicateProbeInput,
  FindCrmDuplicateCandidatesBatchOptions,
  FindCrmDuplicateCandidatesOptions,
} from './crmDuplicateCandidateService';

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function asOptionalString(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== 'string') return undefined;
  return value;
}

function asStringArray(value: unknown): string[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) return undefined;
  if (!value.every((item) => typeof item === 'string')) return undefined;
  return value;
}

function parseAddress(
  value: unknown
): CrmDuplicateProbeInput['address'] | undefined {
  if (value === undefined) return undefined;
  if (!isRecord(value)) return undefined;
  const read = (key: string): string | null => {
    const raw = value[key];
    if (raw === null || raw === undefined) return null;
    if (typeof raw !== 'string') throw new Error('invalid_address');
    return raw;
  };
  try {
    return {
      addressLine1: read('addressLine1'),
      addressLine2: read('addressLine2'),
      city: read('city'),
      state: read('state'),
      postalCode: read('postalCode'),
    };
  } catch {
    return undefined;
  }
}

function parseNameParts(
  value: unknown
): CrmDuplicateProbeInput['nameParts'] | undefined {
  if (value === undefined) return undefined;
  if (!isRecord(value)) return undefined;
  const read = (key: string): string | null | undefined => {
    if (!(key in value)) return undefined;
    const raw = value[key];
    if (raw === null) return null;
    if (typeof raw !== 'string') return undefined;
    return raw;
  };
  const firstName = read('firstName');
  const lastName = read('lastName');
  const fullName = read('fullName');
  // Invalid type on a provided key
  for (const key of ['firstName', 'lastName', 'fullName'] as const) {
    if (key in value && value[key] !== null && typeof value[key] !== 'string') {
      return undefined;
    }
  }
  return { firstName, lastName, fullName };
}

function parseCustomFields(
  value: unknown
): readonly CrmIdentityCustomFieldValue[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) return undefined;
  const fields: CrmIdentityCustomFieldValue[] = [];
  for (const item of value) {
    if (!isRecord(item)) return undefined;
    if (typeof item.fieldKey !== 'string' || typeof item.label !== 'string') return undefined;
    if (item.valueText != null && typeof item.valueText !== 'string') return undefined;
    fields.push({
      definitionId: typeof item.definitionId === 'string' ? item.definitionId : '',
      valueId: typeof item.valueId === 'string' ? item.valueId : null,
      fieldKey: item.fieldKey,
      label: item.label,
      valueText: item.valueText ?? null,
    });
  }
  return fields;
}

function parseRecordType(value: unknown): CrmIdentityRecordType | undefined {
  if (value === undefined) return undefined;
  if (value === 'project' || value === 'subproject') return value;
  return undefined;
}

function parseProbe(body: Record<string, unknown>): CrmDuplicateProbeInput | null {
  const recordType = parseRecordType(body.recordType);
  if (body.recordType !== undefined && recordType === undefined) return null;

  const projectName = asOptionalString(body.projectName);
  const contactName = asOptionalString(body.contactName);
  if (body.projectName !== undefined && projectName === undefined) return null;
  if (body.contactName !== undefined && contactName === undefined) return null;

  const emails = asStringArray(body.emails);
  if (body.emails !== undefined && emails === undefined) return null;
  const phones = asStringArray(body.phones);
  if (body.phones !== undefined && phones === undefined) return null;

  const address = parseAddress(body.address);
  if (body.address !== undefined && address === undefined) return null;

  const nameParts = parseNameParts(body.nameParts);
  if (body.nameParts !== undefined && nameParts === undefined) return null;

  const customFields = parseCustomFields(body.customFields);
  if (body.customFields !== undefined && customFields === undefined) return null;

  const incomingId =
    typeof body.incomingId === 'string' ? body.incomingId : undefined;

  return {
    incomingId,
    recordType,
    projectName,
    contactName,
    emails,
    phones,
    address,
    nameParts,
    customFields,
  };
}

export type ParsedDuplicateCandidatesRequest =
  | { ok: true; options: FindCrmDuplicateCandidatesOptions }
  | { ok: false; message: string };

export function parseDuplicateCandidatesRequest(
  body: unknown
): ParsedDuplicateCandidatesRequest {
  if (!isRecord(body)) {
    return { ok: false, message: 'JSON object body required.' };
  }

  const probe = parseProbe(body);
  if (probe == null) {
    return { ok: false, message: 'Invalid probe payload.' };
  }

  let excludeRecordId: string | null | undefined;
  if (body.excludeRecordId !== undefined) {
    if (body.excludeRecordId !== null && typeof body.excludeRecordId !== 'string') {
      return { ok: false, message: 'excludeRecordId must be a string or null.' };
    }
    excludeRecordId = body.excludeRecordId as string | null;
  }

  let maxCandidates: number | undefined;
  if (body.maxCandidates !== undefined) {
    if (typeof body.maxCandidates !== 'number' || !Number.isInteger(body.maxCandidates)) {
      return { ok: false, message: 'maxCandidates must be an integer.' };
    }
    maxCandidates = body.maxCandidates;
  }

  let minConfidence: CrmDuplicateConfidence | undefined;
  if (body.minConfidence !== undefined) {
    if (typeof body.minConfidence !== 'string' || !isCrmDuplicateConfidence(body.minConfidence)) {
      return { ok: false, message: 'minConfidence must be high, medium, or low.' };
    }
    minConfidence = body.minConfidence;
  }

  let includeArchived: boolean | undefined;
  if (body.includeArchived !== undefined) {
    if (typeof body.includeArchived !== 'boolean') {
      return { ok: false, message: 'includeArchived must be a boolean.' };
    }
    includeArchived = body.includeArchived;
  }

  return {
    ok: true,
    options: {
      probe,
      excludeRecordId,
      maxCandidates,
      minConfidence,
      includeArchived,
    },
  };
}

export type ParsedDuplicateCandidatesBatchRequest =
  | { ok: true; options: FindCrmDuplicateCandidatesBatchOptions }
  | { ok: false; message: string };

export function parseDuplicateCandidatesBatchRequest(
  body: unknown
): ParsedDuplicateCandidatesBatchRequest {
  if (!isRecord(body)) {
    return { ok: false, message: 'JSON object body required.' };
  }
  if (!Array.isArray(body.items)) {
    return { ok: false, message: 'items array is required.' };
  }

  const items: (CrmDuplicateProbeInput & { incomingId: string })[] = [];
  for (const raw of body.items) {
    if (!isRecord(raw)) {
      return { ok: false, message: 'Each batch item must be an object.' };
    }
    if (typeof raw.incomingId !== 'string' || raw.incomingId.trim() === '') {
      return { ok: false, message: 'Each batch item requires a non-empty incomingId.' };
    }
    const probe = parseProbe(raw);
    if (probe == null) {
      return { ok: false, message: `Invalid probe payload for incomingId ${raw.incomingId}.` };
    }
    items.push({ ...probe, incomingId: raw.incomingId });
  }

  let excludeRecordIds: string[] | undefined;
  if (body.excludeRecordIds !== undefined) {
    const arr = asStringArray(body.excludeRecordIds);
    if (arr === undefined) {
      return { ok: false, message: 'excludeRecordIds must be a string array.' };
    }
    excludeRecordIds = arr;
  }

  let maxCandidatesPerIncoming: number | undefined;
  if (body.maxCandidatesPerIncoming !== undefined) {
    if (
      typeof body.maxCandidatesPerIncoming !== 'number' ||
      !Number.isInteger(body.maxCandidatesPerIncoming)
    ) {
      return { ok: false, message: 'maxCandidatesPerIncoming must be an integer.' };
    }
    maxCandidatesPerIncoming = body.maxCandidatesPerIncoming;
  }

  let maxGroups: number | undefined;
  if (body.maxGroups !== undefined) {
    if (typeof body.maxGroups !== 'number' || !Number.isInteger(body.maxGroups)) {
      return { ok: false, message: 'maxGroups must be an integer.' };
    }
    maxGroups = body.maxGroups;
  }

  let minConfidence: CrmDuplicateConfidence | undefined;
  if (body.minConfidence !== undefined) {
    if (typeof body.minConfidence !== 'string' || !isCrmDuplicateConfidence(body.minConfidence)) {
      return { ok: false, message: 'minConfidence must be high, medium, or low.' };
    }
    minConfidence = body.minConfidence;
  }

  let includeIncomingMatches: boolean | undefined;
  if (body.includeIncomingMatches !== undefined) {
    if (typeof body.includeIncomingMatches !== 'boolean') {
      return { ok: false, message: 'includeIncomingMatches must be a boolean.' };
    }
    includeIncomingMatches = body.includeIncomingMatches;
  }

  let includeArchived: boolean | undefined;
  if (body.includeArchived !== undefined) {
    if (typeof body.includeArchived !== 'boolean') {
      return { ok: false, message: 'includeArchived must be a boolean.' };
    }
    includeArchived = body.includeArchived;
  }

  return {
    ok: true,
    options: {
      items,
      excludeRecordIds,
      maxCandidatesPerIncoming,
      maxGroups,
      minConfidence,
      includeIncomingMatches,
      includeArchived,
    },
  };
}
