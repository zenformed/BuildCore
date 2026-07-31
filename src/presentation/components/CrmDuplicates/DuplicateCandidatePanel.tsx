'use client';

import type { ReactElement } from 'react';
import type { CrmDuplicateCandidate, CrmDuplicateConfidence } from '@/domain/crm/identity';
import { useBuildCoreNavigation } from '@/presentation/providers/BuildCoreNavigationProvider';
import sharedStyles from '@/presentation/components/crmShared/crmShared.module.css';
import styles from './DuplicateCandidatePanel.module.css';

export type DuplicateCandidatePanelCopy = {
  readonly checking: string;
  readonly title: string;
  readonly subtitle: string;
  readonly viewProject: string;
  readonly createMayDuplicateNote: string;
  readonly confidenceHigh: string;
  readonly confidenceMedium: string;
  readonly confidenceLow: string;
  readonly lifecycleActive: string;
  readonly lifecycleInactive: string;
  readonly lifecycleArchived: string;
  readonly parentLabel: string;
  readonly contactLabel: string;
  readonly emailLabel: string;
  readonly phoneLabel: string;
  readonly addressLabel: string;
};

export type DuplicateCandidatePanelProps = {
  readonly status: 'idle' | 'loading' | 'ready' | 'error';
  readonly candidates: readonly CrmDuplicateCandidate[];
  readonly copy: DuplicateCandidatePanelCopy;
  /** When true and matches exist, show the non-blocking create note. */
  readonly showCreateNote?: boolean;
  /** When false, hide the panel title/subtitle (caller provides context). Default true. */
  readonly showHeader?: boolean;
  /** When true, show match evidence lines under each candidate. Default false. */
  readonly showEvidence?: boolean;
  /** When true, keep candidates in the order provided (API order). Default false sorts by score. */
  readonly preserveCandidateOrder?: boolean;
  readonly className?: string;
};

function confidenceClass(confidence: CrmDuplicateConfidence): string {
  switch (confidence) {
    case 'high':
      return styles.confidenceHigh;
    case 'medium':
      return styles.confidenceMedium;
    case 'low':
      return styles.confidenceLow;
    default: {
      const _exhaustive: never = confidence;
      return _exhaustive;
    }
  }
}

function confidenceLabel(
  confidence: CrmDuplicateConfidence,
  copy: DuplicateCandidatePanelCopy
): string {
  switch (confidence) {
    case 'high':
      return copy.confidenceHigh;
    case 'medium':
      return copy.confidenceMedium;
    case 'low':
      return copy.confidenceLow;
    default: {
      const _exhaustive: never = confidence;
      return _exhaustive;
    }
  }
}

function lifecycleLabel(
  status: CrmDuplicateCandidate['record']['lifecycleStatus'],
  copy: DuplicateCandidatePanelCopy
): string {
  switch (status) {
    case 'active':
      return copy.lifecycleActive;
    case 'inactive':
      return copy.lifecycleInactive;
    case 'archived':
      return copy.lifecycleArchived;
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

function buildProjectHref(
  candidate: CrmDuplicateCandidate,
  routes: {
    readonly projectDetail: (slug: string) => string;
    readonly projectSubDetail: (parentSlug: string, subSlug: string) => string;
  }
): string | null {
  const { record } = candidate;
  if (!record.slug) return null;
  if (record.recordType === 'subproject' && record.parentProjectSlug) {
    return routes.projectSubDetail(record.parentProjectSlug, record.slug);
  }
  return routes.projectDetail(record.slug);
}

/**
 * Reusable duplicate candidate warning panel for create forms and (later) import.
 * Presentation only — callers own fetching via useDuplicateCandidateCheck / batch API.
 */
function evidenceLine(candidate: CrmDuplicateCandidate): string | null {
  if (candidate.evidence.length === 0) return null;
  const parts = candidate.evidence.map((item) => {
    const label = item.existingSources[0]?.fieldLabel ?? item.valueType;
    return `${label}: ${item.normalizedValue}`;
  });
  return parts.join(' · ');
}

export function DuplicateCandidatePanel({
  status,
  candidates,
  copy,
  showCreateNote = false,
  showHeader = true,
  showEvidence = false,
  preserveCandidateOrder = false,
  className,
}: DuplicateCandidatePanelProps): ReactElement | null {
  const nav = useBuildCoreNavigation();

  if (status === 'loading') {
    return (
      <p className={styles.checking} role="status" aria-live="polite">
        <span className={styles.spinner} aria-hidden />
        {copy.checking}
      </p>
    );
  }

  if (status !== 'ready' || candidates.length === 0) {
    return null;
  }

  const ordered = preserveCandidateOrder
    ? [...candidates]
    : [...candidates].sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.record.id.localeCompare(b.record.id);
      });

  return (
    <div
      className={[styles.panel, className].filter(Boolean).join(' ')}
      role="region"
      aria-label={copy.title}
    >
      {showHeader ? (
        <>
          <h3 className={styles.title}>{copy.title}</h3>
          <p className={styles.subtitle}>{copy.subtitle}</p>
        </>
      ) : null}
      <ul className={styles.list}>
        {ordered.map((candidate) => {
          const href = buildProjectHref(candidate, nav.routes);
          const { record } = candidate;
          const email = record.emails[0] ?? null;
          const phone = record.phones[0] ?? null;
          const evidence = showEvidence ? evidenceLine(candidate) : null;
          return (
            <li key={record.id} className={styles.item}>
              <div className={styles.itemHeader}>
                <p className={styles.itemName}>{record.name}</p>
                <span className={`${styles.confidence} ${confidenceClass(candidate.confidence)}`}>
                  {confidenceLabel(candidate.confidence, copy)}
                </span>
              </div>
              <div className={styles.statusLine}>
                <span className={sharedStyles.stagePill}>{record.stageLabel}</span>
                <span className={styles.meta}>{lifecycleLabel(record.lifecycleStatus, copy)}</span>
              </div>
              {record.parentProjectName ? (
                <p className={styles.meta}>
                  {copy.parentLabel}: {record.parentProjectName}
                </p>
              ) : null}
              {record.contactName ? (
                <p className={styles.meta}>
                  {copy.contactLabel}: {record.contactName}
                </p>
              ) : null}
              {email ? (
                <p className={styles.meta}>
                  {copy.emailLabel}: {email}
                </p>
              ) : null}
              {phone ? (
                <p className={styles.meta}>
                  {copy.phoneLabel}: {phone}
                </p>
              ) : null}
              {record.addressLine ? (
                <p className={styles.meta}>
                  {copy.addressLabel}: {record.addressLine}
                </p>
              ) : null}
              {evidence ? <p className={styles.meta}>{evidence}</p> : null}
              {href ? (
                <a
                  className={styles.viewLink}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {copy.viewProject}
                </a>
              ) : null}
            </li>
          );
        })}
      </ul>
      {showCreateNote ? <p className={styles.createNote}>{copy.createMayDuplicateNote}</p> : null}
    </div>
  );
}
