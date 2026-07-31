'use client';

import type { ReactElement, ReactNode } from 'react';
import type {
  CrmDuplicateCandidate,
  CrmDuplicateConfidence,
  CrmDuplicateMatchEvidence,
  CrmIdentityValueType,
} from '@/domain/crm/identity';
import { normalizeIdentityValue } from '@/domain/crm/identity';
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

function evidenceNormalizedValues(
  evidence: readonly CrmDuplicateMatchEvidence[],
  valueType: CrmIdentityValueType
): ReadonlySet<string> {
  return new Set(
    evidence.filter((item) => item.valueType === valueType).map((item) => item.normalizedValue)
  );
}

/** True only when this exact display value is one of the matched evidence values. */
function displayValueMatched(
  valueType: CrmIdentityValueType,
  displayValue: string,
  evidence: readonly CrmDuplicateMatchEvidence[]
): boolean {
  const matched = evidenceNormalizedValues(evidence, valueType);
  if (matched.size === 0) return false;
  const normalized = normalizeIdentityValue(valueType, displayValue);
  return normalized != null && matched.has(normalized);
}

function preferredDisplayForNormalized(
  valueType: CrmIdentityValueType,
  normalizedValue: string,
  candidates: readonly string[]
): string {
  for (const candidate of candidates) {
    const normalized = normalizeIdentityValue(valueType, candidate);
    if (normalized === normalizedValue) return candidate;
  }
  return normalizedValue;
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

function MatchPill({ value }: { readonly value: string }): ReactElement {
  return (
    <span className={styles.matchPill}>
      <span className={styles.matchPillValue}>{value}</span>
      <span className={styles.matchMark} aria-hidden>
        !
      </span>
    </span>
  );
}

function MetaField({
  label,
  value,
  matched,
}: {
  readonly label: string;
  readonly value: string;
  readonly matched: boolean;
}): ReactElement {
  return (
    <p className={styles.meta}>
      <span className={styles.metaLabel}>{label}:</span>{' '}
      {matched ? <MatchPill value={value} /> : <span>{value}</span>}
    </p>
  );
}

function ContactValueFields({
  label,
  valueType,
  values,
  evidence,
}: {
  readonly label: string;
  readonly valueType: 'email' | 'phone';
  readonly values: readonly string[];
  readonly evidence: readonly CrmDuplicateMatchEvidence[];
}): ReactElement | null {
  const matchedNorms = evidenceNormalizedValues(evidence, valueType);
  if (values.length === 0 && matchedNorms.size === 0) return null;

  const shownNorms = new Set<string>();
  const rows: ReactNode[] = [];

  for (const value of values) {
    const normalized = normalizeIdentityValue(valueType, value);
    const matched = normalized != null && matchedNorms.has(normalized);
    if (normalized != null) shownNorms.add(normalized);
    rows.push(
      <MetaField
        key={`${valueType}:${value}`}
        label={label}
        value={value}
        matched={matched}
      />
    );
  }

  // Matched identity values not present in the displayed primary list (stale/extra index).
  for (const normalized of matchedNorms) {
    if (shownNorms.has(normalized)) continue;
    rows.push(
      <MetaField
        key={`${valueType}:matched:${normalized}`}
        label={label}
        value={preferredDisplayForNormalized(valueType, normalized, values)}
        matched
      />
    );
  }

  return rows.length > 0 ? <>{rows}</> : null;
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
          const evidenceExtra = showEvidence ? evidenceLine(candidate) : null;
          const nameMatched =
            (record.contactName != null &&
              displayValueMatched('name', record.contactName, candidate.evidence)) ||
            displayValueMatched('name', record.name, candidate.evidence);

          return (
            <li key={record.id} className={styles.item}>
              <div className={styles.itemHeader}>
                <p className={styles.itemName}>
                  {!record.contactName && nameMatched ? (
                    <MatchPill value={record.name} />
                  ) : (
                    record.name
                  )}
                </p>
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
                <MetaField
                  label={copy.contactLabel}
                  value={record.contactName}
                  matched={displayValueMatched('name', record.contactName, candidate.evidence)}
                />
              ) : null}
              <ContactValueFields
                label={copy.emailLabel}
                valueType="email"
                values={record.emails}
                evidence={candidate.evidence}
              />
              <ContactValueFields
                label={copy.phoneLabel}
                valueType="phone"
                values={record.phones}
                evidence={candidate.evidence}
              />
              {record.addressLine ? (
                <MetaField
                  label={copy.addressLabel}
                  value={record.addressLine}
                  matched={displayValueMatched('address', record.addressLine, candidate.evidence)}
                />
              ) : null}
              {evidenceExtra ? <p className={styles.meta}>{evidenceExtra}</p> : null}
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
