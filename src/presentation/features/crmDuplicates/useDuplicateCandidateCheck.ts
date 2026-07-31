'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { ProjectCustomFieldDefinition } from '@/domain/buildcore/projectCustomFields';
import type { CrmDuplicateCandidate } from '@/domain/crm/identity';
import { CrmApiError } from '@/infrastructure/crm/api/crmApiClient';
import { fetchCrmDuplicateCandidates } from '@/infrastructure/crm/api/crmDuplicateCandidatesApi';
import type { CreateCrmProjectFormState } from '@/presentation/features/crmCreate/createCrmProjectFormModel';
import {
  buildCreateFormDuplicateProbe,
  createFormDuplicateIdentityKey,
  createFormHasEnoughIdentityForDuplicateCheck,
} from './createFormDuplicateProbe';

export type UseDuplicateCandidateCheckOptions = {
  readonly enabled: boolean;
  readonly form: CreateCrmProjectFormState;
  readonly recordType: 'project' | 'subproject';
  readonly customFieldDraft: Readonly<Record<string, string>>;
  readonly customFieldDefinitions: readonly ProjectCustomFieldDefinition[];
  readonly excludeRecordId?: string | null;
  readonly debounceMs?: number;
};

export type DuplicateCandidateCheckStatus = 'idle' | 'loading' | 'ready' | 'error';

export type UseDuplicateCandidateCheckResult = {
  readonly status: DuplicateCandidateCheckStatus;
  readonly candidates: readonly CrmDuplicateCandidate[];
  readonly hasMatches: boolean;
};

const DEFAULT_DEBOUNCE_MS = 500;

export function useDuplicateCandidateCheck(
  options: UseDuplicateCandidateCheckOptions
): UseDuplicateCandidateCheckResult {
  const debounceMs = options.debounceMs ?? DEFAULT_DEBOUNCE_MS;
  const [status, setStatus] = useState<DuplicateCandidateCheckStatus>('idle');
  const [candidates, setCandidates] = useState<readonly CrmDuplicateCandidate[]>([]);
  const requestIdRef = useRef(0);

  const definitionKeys = useMemo(
    () => options.customFieldDefinitions.map((definition) => definition.fieldKey),
    [options.customFieldDefinitions]
  );

  const identityKey = createFormDuplicateIdentityKey(
    options.form,
    options.customFieldDraft,
    options.excludeRecordId,
    options.recordType,
    definitionKeys
  );

  const probeRef = useRef(options);
  probeRef.current = options;

  useEffect(() => {
    const current = probeRef.current;
    if (!current.enabled) {
      setStatus('idle');
      setCandidates([]);
      return;
    }

    if (
      !createFormHasEnoughIdentityForDuplicateCheck(current.form, current.customFieldDraft)
    ) {
      setStatus('idle');
      setCandidates([]);
      return;
    }

    const requestId = ++requestIdRef.current;
    setStatus('loading');

    const timer = window.setTimeout(() => {
      const latest = probeRef.current;
      const probe = buildCreateFormDuplicateProbe({
        form: latest.form,
        recordType: latest.recordType,
        customFieldDraft: latest.customFieldDraft,
        customFieldDefinitions: latest.customFieldDefinitions,
        excludeRecordId: latest.excludeRecordId,
      });

      void fetchCrmDuplicateCandidates(probe)
        .then((response) => {
          if (requestId !== requestIdRef.current) return;
          setCandidates(response.candidates);
          setStatus('ready');
        })
        .catch((err: unknown) => {
          if (requestId !== requestIdRef.current) return;
          if (!(err instanceof CrmApiError && err.status === 401)) {
            console.error('[duplicates] candidate check failed', err);
          }
          setCandidates([]);
          setStatus('error');
        });
    }, debounceMs);

    return () => {
      window.clearTimeout(timer);
    };
  }, [identityKey, debounceMs]);

  return {
    status,
    candidates,
    hasMatches: status === 'ready' && candidates.length > 0,
  };
}
