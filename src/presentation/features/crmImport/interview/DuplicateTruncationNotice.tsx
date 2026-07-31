'use client';

import { useState, type ReactElement } from 'react';
import { LuCircleAlert } from 'react-icons/lu';
import type { CrmDuplicateTruncationMeta } from '@/domain/crm/identity';
import {
  buildDuplicateTruncationWarningModel,
  type DuplicateTruncationWarningCopy,
} from '@/presentation/features/crmImport/interview/duplicateTruncationWarningPresentation';
import dupStyles from '@/presentation/features/crmImport/interview/screens/DuplicateCheckScreen.module.css';

export function DuplicateTruncationNotice({
  meta,
  copy,
}: {
  readonly meta: CrmDuplicateTruncationMeta | null | undefined;
  readonly copy: DuplicateTruncationWarningCopy;
}): ReactElement | null {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const model = buildDuplicateTruncationWarningModel(meta, copy);
  if (model == null) return null;

  return (
    <div className={dupStyles.truncationNotice} role="status">
      <LuCircleAlert size={14} aria-hidden />
      <div className={dupStyles.truncationNoticeBody}>
        <p className={dupStyles.truncationNoticeSummary}>{model.summary}</p>
        {model.details != null ? (
          <>
            <button
              type="button"
              className={dupStyles.truncationDetailsToggle}
              aria-expanded={detailsOpen}
              onClick={() => setDetailsOpen((open) => !open)}
            >
              {detailsOpen ? 'Hide details' : copy.viewDetails}
            </button>
            {detailsOpen ? (
              <ul className={dupStyles.truncationDetailsList}>
                {model.details.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}

export function duplicateCheckTruncationCopyFromContent(copy: {
  readonly truncationWarning: string;
  readonly truncationExistingRecords: (searched: number, matching: number) => string;
  readonly truncationIdentityValues: (searched: number, total: number) => string;
  readonly truncationMultiple: string;
  readonly truncationViewDetails: string;
  readonly truncationDetailIdentity: (searched: number, total: number) => string;
  readonly truncationDetailExisting: (searched: number, matching: number) => string;
  readonly truncationDetailCandidates: (returned: number, total: number) => string;
  readonly truncationDetailGroups: (returned: number, total: number) => string;
  readonly truncationChunkFailed: string;
  readonly truncationCandidatesCapped: (returned: number, total: number) => string;
  readonly truncationGroupsCapped: (returned: number, total: number) => string;
}): DuplicateTruncationWarningCopy {
  return {
    existingRecordsPartial: copy.truncationExistingRecords,
    identityValuesPartial: copy.truncationIdentityValues,
    multipleLimitsSummary: copy.truncationMultiple,
    viewDetails: copy.truncationViewDetails,
    detailIdentityValues: copy.truncationDetailIdentity,
    detailExistingRecords: copy.truncationDetailExisting,
    detailCandidates: copy.truncationDetailCandidates,
    detailGroups: copy.truncationDetailGroups,
    chunkFailed: copy.truncationChunkFailed,
    candidatesCapped: copy.truncationCandidatesCapped,
    groupsCapped: copy.truncationGroupsCapped,
    genericPartial: copy.truncationWarning,
  };
}

export function reviewTruncationCopyFromContent(copy: {
  readonly duplicatesTruncationWarning: string;
  readonly duplicatesTruncationExistingRecords: (searched: number, matching: number) => string;
  readonly duplicatesTruncationIdentityValues: (searched: number, total: number) => string;
  readonly duplicatesTruncationMultiple: string;
  readonly duplicatesTruncationViewDetails: string;
  readonly duplicatesTruncationDetailIdentity: (searched: number, total: number) => string;
  readonly duplicatesTruncationDetailExisting: (searched: number, matching: number) => string;
  readonly duplicatesTruncationDetailCandidates: (returned: number, total: number) => string;
  readonly duplicatesTruncationDetailGroups: (returned: number, total: number) => string;
  readonly duplicatesTruncationChunkFailed: string;
  readonly duplicatesTruncationCandidatesCapped: (returned: number, total: number) => string;
  readonly duplicatesTruncationGroupsCapped: (returned: number, total: number) => string;
}): DuplicateTruncationWarningCopy {
  return {
    existingRecordsPartial: copy.duplicatesTruncationExistingRecords,
    identityValuesPartial: copy.duplicatesTruncationIdentityValues,
    multipleLimitsSummary: copy.duplicatesTruncationMultiple,
    viewDetails: copy.duplicatesTruncationViewDetails,
    detailIdentityValues: copy.duplicatesTruncationDetailIdentity,
    detailExistingRecords: copy.duplicatesTruncationDetailExisting,
    detailCandidates: copy.duplicatesTruncationDetailCandidates,
    detailGroups: copy.duplicatesTruncationDetailGroups,
    chunkFailed: copy.duplicatesTruncationChunkFailed,
    candidatesCapped: copy.duplicatesTruncationCandidatesCapped,
    groupsCapped: copy.duplicatesTruncationGroupsCapped,
    genericPartial: copy.duplicatesTruncationWarning,
  };
}
