export type {
  CrmIdentityAddressParts,
  CrmIdentityCustomFieldValue,
  CrmIdentityNameParts,
  CrmIdentityRecordSnapshot,
  CrmIdentityRecordType,
  CrmIdentitySourceKind,
  CrmIdentityValueDraft,
  CrmIdentityValueType,
} from './identityTypes';
export {
  CRM_IDENTITY_SOURCE_KINDS,
  CRM_IDENTITY_SOURCE_PRIORITY,
  CRM_IDENTITY_TEXT_MAX_LENGTH,
  CRM_IDENTITY_VALUE_TYPES,
} from './identityTypes';
export {
  composeIdentityAddressRaw,
  isIdentityStopValue,
  normalizeIdentityAddress,
  normalizeIdentityEmail,
  normalizeIdentityName,
  normalizeIdentityPhone,
  normalizeIdentityText,
  normalizeIdentityTextValue,
  normalizeIdentityValue,
} from './normalizeIdentityValue';
export {
  classifyCustomFieldIdentityRole,
  type CustomFieldIdentityRole,
} from './customFieldIdentityHeuristics';
export { collapseIdentityValueDrafts, extractIdentityValues } from './extractIdentityValues';
export {
  accumulateBestCandidatesAcrossRecordChunks,
  buildIncomingIncomingEdges,
  buildDuplicateCandidateGroups,
  matchProbeAgainstIdentityHits,
  mergeBestDuplicateCandidatesByRecordId,
  parseIdentityLookupKey,
  preferBetterDuplicateCandidate,
  takeTopDuplicateCandidates,
  uniqueLookupKeysWithinLimit,
} from './duplicateMatchingCore';
export type {
  CrmDuplicateIdentityHit,
  CrmDuplicateProbeDrafts,
} from './duplicateMatchingCore';
export {
  CRM_DUPLICATE_CONFIDENCE_LEVELS,
  CRM_DUPLICATE_DETECTION_LIMITS,
  CRM_DUPLICATE_MIN_SCORE_TO_RETURN,
  CRM_DUPLICATE_SCORE_WEIGHTS,
  CRM_DUPLICATE_TRUNCATION_REASONS,
  draftToEvidenceSource,
  evidenceSourceKey,
  isCrmDuplicateConfidence,
} from './duplicateCandidateTypes';
export type {
  CrmDuplicateCandidate,
  CrmDuplicateCandidateGroup,
  CrmDuplicateCandidateRecordSummary,
  CrmDuplicateConfidence,
  CrmDuplicateEvidenceSource,
  CrmDuplicateLifecycleStatus,
  CrmDuplicateMatchEvidence,
  CrmDuplicateTruncationMeta,
  CrmDuplicateTruncationReason,
} from './duplicateCandidateTypes';
export {
  classifyDuplicateConfidence,
  compareDuplicateCandidates,
  confidenceRank,
  isDuplicateCandidateLifecycleIncluded,
  lifecycleRank,
  meetsMinConfidence,
  scoreDuplicateEvidence,
  shouldReturnDuplicateCandidate,
} from './duplicateConfidence';
export {
  DuplicateUnionFind,
  buildMatchEvidenceItem,
  capEvidence,
  existingNodeId,
  identityLookupKey,
  incomingNodeId,
  mergeDuplicateEvidence,
  parseGroupNodeId,
} from './duplicateEvidence';
export type {
  DuplicateResolveRecordAction,
  MergeFieldCardinality,
  MergeFieldConflict,
  MergeFieldIdentical,
  MergeFieldMultiConflict,
  MergeFieldSingleConflict,
  MergeFieldState,
  MergeValueSide,
} from './mergeFieldSelection';
export {
  DUPLICATE_RESOLVE_RECORD_ACTIONS,
  MERGE_VALUE_SIDES,
  buildMultiMergeField,
  buildScalarMergeField,
  defaultMergeFieldsForUpdateExisting,
  isMergeFieldConflict,
  mergeFieldSelectionEnabled,
  replaceMergeField,
  resolveSurvivingMultiValues,
  resolveSurvivingScalar,
  selectSingleMergeSide,
  toggleMultiMergeSide,
} from './mergeFieldSelection';

