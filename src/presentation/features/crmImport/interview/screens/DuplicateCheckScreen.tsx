'use client';

import { Fragment, useMemo, type ReactElement, type ReactNode } from 'react';
import {
  LuBuilding2,
  LuCircleAlert,
  LuExternalLink,
  LuFileSpreadsheet,
} from 'react-icons/lu';
import type { CrmDuplicateCandidate, CrmDuplicateTruncationMeta } from '@/domain/crm/identity';
import type {
  ImportDuplicateDecision,
  ImportDuplicateDecisionMap,
  ImportDuplicateReviewItem,
} from '@/domain/crm/importDuplicateDecisions';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import sharedStyles from '@/presentation/components/crmShared/crmShared.module.css';
import { useBuildCoreNavigation } from '@/presentation/providers/BuildCoreNavigationProvider';
import styles from '@/presentation/components/CrmImport/SpreadsheetImportWizard.module.css';
import {
  DuplicateTruncationNotice,
  duplicateCheckTruncationCopyFromContent,
} from '@/presentation/features/crmImport/interview/DuplicateTruncationNotice';
import {
  buildMatchEvidenceColumns,
  existingRecordProjectLabel,
  reviewItemIdentifier,
  sortDuplicateReviewItemsForTable,
  type DuplicateMatchEvidenceColumn,
} from '@/presentation/features/crmImport/interview/duplicateReviewTablePresentation';
import dupStyles from '@/presentation/features/crmImport/interview/screens/DuplicateCheckScreen.module.css';

export type DuplicateCheckScreenProps = {
  readonly status: 'idle' | 'loading' | 'ready' | 'error';
  readonly errorMessage: string | null;
  readonly progressLabel: string | null;
  readonly truncationMeta: CrmDuplicateTruncationMeta | null;
  readonly totalRows: number;
  readonly items: readonly ImportDuplicateReviewItem[];
  readonly decisions: ImportDuplicateDecisionMap;
  readonly disabled?: boolean;
  /** Display name of the project being imported into. */
  readonly targetProjectName?: string | null;
  /** Optional href for the destination project (opens in new tab). */
  readonly targetProjectHref?: string | null;
  /** Optional slug used when href is not provided. */
  readonly targetProjectSlug?: string | null;
  readonly onDecisionChange: (decision: ImportDuplicateDecision) => void;
};

type DuplicateCheckCopy = (typeof content.crm.spreadsheetImport.interview)['duplicateCheck'];

function buildRecordHref(
  candidate: CrmDuplicateCandidate,
  routes: {
    readonly projectDetail: (slug: string) => string;
    readonly projectSubDetail: (parentSlug: string, subSlug: string) => string;
  }
): string | null {
  const { record } = candidate;
  if (record.recordType === 'subproject' && record.parentProjectSlug) {
    return routes.projectDetail(record.parentProjectSlug);
  }
  if (!record.slug) return null;
  return routes.projectDetail(record.slug);
}

function SummaryMetrics({
  copy,
  totalRows,
  uniqueRows,
  existingMatchRows,
  incomingMatchRows,
  needsDecision,
}: {
  readonly copy: DuplicateCheckCopy;
  readonly totalRows: number;
  readonly uniqueRows: number;
  readonly existingMatchRows: number;
  readonly incomingMatchRows: number;
  readonly needsDecision: number;
}): ReactElement {
  const metrics = [
    { key: 'total', value: totalRows, label: copy.metricTotalRows },
    { key: 'unique', value: uniqueRows, label: copy.metricUniqueRows },
    { key: 'existing', value: existingMatchRows, label: copy.metricExistingMatches },
    { key: 'incoming', value: incomingMatchRows, label: copy.metricIncomingMatches },
    {
      key: 'needs',
      value: needsDecision,
      label: copy.metricNeedsDecision,
      emphasize: needsDecision > 0,
    },
  ] as const;

  return (
    <div className={dupStyles.summaryMetrics} role="group" aria-label={copy.summaryAriaLabel}>
      {metrics.map((metric) => (
        <div
          key={metric.key}
          className={[
            dupStyles.summaryMetric,
            'emphasize' in metric && metric.emphasize ? dupStyles.summaryMetricNeedsDecision : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <p className={dupStyles.summaryMetricValue}>{metric.value.toLocaleString()}</p>
          <p className={dupStyles.summaryMetricLabel}>{metric.label}</p>
        </div>
      ))}
    </div>
  );
}

function ProjectLink({
  label,
  href,
}: {
  readonly label: string;
  readonly href: string | null;
}): ReactElement {
  if (!href) {
    return <span className={dupStyles.projectPlain}>{label}</span>;
  }
  return (
    <a
      className={dupStyles.projectLink}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
    >
      <span>{label}</span>
      <LuExternalLink size={12} aria-hidden />
    </a>
  );
}

function MatchEvidencePill({
  value,
  fieldLabel,
}: {
  readonly value: string;
  readonly fieldLabel: string;
}): ReactElement {
  return (
    <div className={dupStyles.matchEvidence}>
      <div className={dupStyles.matchPill}>
        <span className={dupStyles.matchPillValue}>{value}</span>
        <span className={dupStyles.matchMark} aria-hidden>
          !
        </span>
      </div>
      <span className={dupStyles.matchPillField}>({fieldLabel})</span>
    </div>
  );
}

function MatchEvidenceCell({
  column,
  side,
}: {
  readonly column: DuplicateMatchEvidenceColumn | null;
  readonly side: 'incoming' | 'existing';
}): ReactElement {
  if (column == null) {
    return <span className={dupStyles.emptyDash}>—</span>;
  }
  return (
    <MatchEvidencePill
      value={column.displayValue}
      fieldLabel={
        side === 'incoming' ? column.incomingFieldLabel : column.existingFieldLabel
      }
    />
  );
}

function DuplicatePairGroup({
  item,
  copy,
  decision,
  disabled,
  targetProjectName,
  targetProjectHref,
  targetProjectSlug,
  onDecisionChange,
}: {
  readonly item: ImportDuplicateReviewItem;
  readonly copy: DuplicateCheckCopy;
  readonly decision: ImportDuplicateDecisionMap[string] | undefined;
  readonly disabled: boolean;
  readonly targetProjectName?: string | null;
  readonly targetProjectHref?: string | null;
  readonly targetProjectSlug?: string | null;
  readonly onDecisionChange: (decision: ImportDuplicateDecision) => void;
}): ReactElement {
  const nav = useBuildCoreNavigation();
  const best = item.existingCandidates[0] ?? null;
  const peer = best == null ? item.peerIncoming[0] ?? null : null;
  const { columns } = buildMatchEvidenceColumns({
    item,
    candidate: best,
  });
  const decisionName = `same-customer-${item.incomingId}`;
  const yesSelected = decision?.sameCustomer === true;
  const noSelected = decision?.sameCustomer === false;

  const spreadsheetProject = targetProjectName?.trim() || '—';
  const spreadsheetHref =
    targetProjectHref ??
    (targetProjectSlug ? nav.routes.projectDetail(targetProjectSlug) : null);
  const existingProject = best
    ? existingRecordProjectLabel(best)
    : targetProjectName?.trim() || '—';
  const existingHref = best ? buildRecordHref(best, nav.routes) : null;
  const existingIdentifier = best
    ? reviewItemIdentifier({
        name: best.record.name,
        contactName: best.record.contactName,
      })
    : peer
      ? reviewItemIdentifier(peer)
      : '—';
  const existingStage = best?.record.stageLabel?.trim() || null;

  const matchSlots: Array<DuplicateMatchEvidenceColumn | null> = [
    columns[0] ?? null,
    columns[1] ?? null,
    columns[2] ?? null,
  ];

  return (
    <tbody className={dupStyles.pairGroup}>
      <tr className={dupStyles.pairRow}>
          <td data-label={copy.colSource}>
            <span className={dupStyles.sourceCell}>
              <span className={dupStyles.sourceLabelRow}>
                <LuFileSpreadsheet size={14} className={dupStyles.sourceIconSheet} aria-hidden />
                <span>{copy.sourceSpreadsheet}</span>
              </span>
              <span className={dupStyles.sourceMeta}>
                {copy.spreadsheetRow(item.displayRowNumber)}
              </span>
            </span>
          </td>
          <td data-label={copy.colIdentifier}>
            <span className={dupStyles.identifier}>{reviewItemIdentifier(item)}</span>
          </td>
          <td data-label={copy.colProject}>
            <ProjectLink label={spreadsheetProject} href={spreadsheetHref} />
          </td>
          <td data-label={copy.colStage}>
            <span className={dupStyles.emptyDash}>—</span>
          </td>
          {matchSlots.map((column, index) => (
            <td key={`in-${index}`} data-label={copy.matchColumnTitle(index + 1)}>
              <MatchEvidenceCell column={column} side="incoming" />
            </td>
          ))}
          <td
            className={dupStyles.decisionCell}
            data-label={copy.colSameCustomer}
            rowSpan={2}
          >
            <fieldset className={dupStyles.decisionFieldset} disabled={disabled}>
              <legend className={styles.srOnly}>{copy.decisionLegend}</legend>
              <label
                className={[
                  dupStyles.decisionOption,
                  yesSelected ? dupStyles.decisionOptionSelected : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <input
                  type="radio"
                  name={decisionName}
                  checked={yesSelected}
                  onChange={() =>
                    onDecisionChange({
                      incomingId: item.incomingId,
                      sameCustomer: true,
                      matchedRecordId: best?.record.id,
                    })
                  }
                />
                <span>{copy.sameCustomerYes}</span>
              </label>
              <label
                className={[
                  dupStyles.decisionOption,
                  noSelected ? dupStyles.decisionOptionSelected : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <input
                  type="radio"
                  name={decisionName}
                  checked={noSelected}
                  onChange={() =>
                    onDecisionChange({
                      incomingId: item.incomingId,
                      sameCustomer: false,
                    })
                  }
                />
                <span>{copy.sameCustomerNo}</span>
              </label>
            </fieldset>
          </td>
        </tr>

        <tr className={[dupStyles.pairRow, dupStyles.pairRowExisting].join(' ')}>
          <td data-label={copy.colSource}>
            <span className={dupStyles.sourceCell}>
              <span className={dupStyles.sourceLabelRow}>
                {best ? (
                  <LuBuilding2 size={14} className={dupStyles.sourceIconExisting} aria-hidden />
                ) : (
                  <LuFileSpreadsheet size={14} className={dupStyles.sourceIconSheet} aria-hidden />
                )}
                <span>{best ? copy.sourceExisting : copy.sourceSpreadsheet}</span>
              </span>
            </span>
          </td>
          <td data-label={copy.colIdentifier}>
            <span className={dupStyles.identifier}>{existingIdentifier}</span>
          </td>
          <td data-label={copy.colProject}>
            <ProjectLink label={existingProject} href={existingHref} />
          </td>
          <td data-label={copy.colStage}>
            {existingStage ? (
              <span className={sharedStyles.stagePill}>{existingStage}</span>
            ) : (
              <span className={dupStyles.emptyDash}>—</span>
            )}
          </td>
          {matchSlots.map((column, index) => (
            <td key={`ex-${index}`} data-label={copy.matchColumnTitle(index + 1)}>
              <MatchEvidenceCell column={column} side="existing" />
            </td>
          ))}
        </tr>
      </tbody>
  );
}

function ScreenShell({
  children,
  heading,
  hint,
}: {
  readonly children: ReactNode;
  readonly heading: string;
  readonly hint?: string | null;
}): ReactElement {
  return (
    <div className={[styles.duplicateCheckScreen, dupStyles.screen].join(' ')}>
      <div className={dupStyles.header}>
        <h2 className={styles.screenHeading}>{heading}</h2>
        {hint ? <p className={styles.screenHint}>{hint}</p> : null}
      </div>
      {children}
    </div>
  );
}

export function DuplicateCheckScreen({
  status,
  errorMessage,
  progressLabel,
  truncationMeta,
  totalRows,
  items,
  decisions,
  disabled = false,
  targetProjectName,
  targetProjectHref,
  targetProjectSlug,
  onDecisionChange,
}: DuplicateCheckScreenProps): ReactElement {
  const copy = content.crm.spreadsheetImport.interview.duplicateCheck;
  const truncationCopy = duplicateCheckTruncationCopyFromContent(copy);
  const sortedItems = useMemo(() => sortDuplicateReviewItemsForTable(items), [items]);

  if (status === 'loading' || status === 'idle') {
    return (
      <ScreenShell heading={copy.heading} hint={copy.checkingHint}>
        <p className={dupStyles.checking} role="status" aria-live="polite">
          <span className={dupStyles.spinner} aria-hidden />
          {progressLabel ?? copy.checking}
        </p>
      </ScreenShell>
    );
  }

  if (status === 'error') {
    return (
      <ScreenShell heading={copy.heading}>
        <div className={dupStyles.errorBanner} role="alert">
          <LuCircleAlert size={16} aria-hidden />
          <span>{errorMessage ?? copy.checkFailed}</span>
        </div>
      </ScreenShell>
    );
  }

  if (items.length === 0) {
    return (
      <ScreenShell heading={copy.heading} hint={copy.noneFoundBody}>
        <DuplicateTruncationNotice meta={truncationMeta} copy={truncationCopy} />
      </ScreenShell>
    );
  }

  const existingMatchRows = items.filter((item) => item.existingCandidates.length > 0).length;
  const incomingMatchRows = items.filter((item) => item.peerIncoming.length > 0).length;
  const needsDecision = items.filter((item) => decisions[item.incomingId] == null).length;
  const uniqueRows = Math.max(0, totalRows - items.length);

  return (
    <div className={[styles.duplicateCheckScreen, dupStyles.screen].join(' ')}>
      <div className={dupStyles.header}>
        <h2 className={styles.screenHeading}>{copy.heading}</h2>
        <p className={styles.screenHint}>{copy.hint}</p>
        <SummaryMetrics
          copy={copy}
          totalRows={totalRows}
          uniqueRows={uniqueRows}
          existingMatchRows={existingMatchRows}
          incomingMatchRows={incomingMatchRows}
          needsDecision={needsDecision}
        />
        <DuplicateTruncationNotice meta={truncationMeta} copy={truncationCopy} />
      </div>

      <div className={dupStyles.tableScroll}>
        <div className={dupStyles.tableWrap}>
          <table className={dupStyles.table} aria-label={copy.tableAriaLabel}>
            <colgroup>
              <col className={dupStyles.sourceCol} />
              <col className={dupStyles.identifierCol} />
              <col className={dupStyles.projectCol} />
              <col className={dupStyles.stageCol} />
              <col className={dupStyles.matchCol} />
              <col className={dupStyles.matchCol} />
              <col className={dupStyles.matchCol} />
              <col className={dupStyles.decisionCol} />
            </colgroup>
            <thead>
              <tr>
                <th scope="col">
                  <span className={dupStyles.thStack}>
                    <span className={dupStyles.thTitle}>{copy.colSource}</span>
                    <span className={dupStyles.thHint} aria-hidden>
                      &nbsp;
                    </span>
                  </span>
                </th>
                <th scope="col">
                  <span className={dupStyles.thStack}>
                    <span className={dupStyles.thTitle}>{copy.colIdentifier}</span>
                    <span className={dupStyles.thHint}>{copy.colIdentifierHint}</span>
                  </span>
                </th>
                <th scope="col">
                  <span className={dupStyles.thStack}>
                    <span className={dupStyles.thTitle}>{copy.colProject}</span>
                    <span className={dupStyles.thHint} aria-hidden>
                      &nbsp;
                    </span>
                  </span>
                </th>
                <th scope="col">
                  <span className={dupStyles.thStack}>
                    <span className={dupStyles.thTitle}>{copy.colStage}</span>
                    <span className={dupStyles.thHint} aria-hidden>
                      &nbsp;
                    </span>
                  </span>
                </th>
                <th scope="col">
                  <span className={dupStyles.thStack}>
                    <span className={dupStyles.thTitle}>{copy.matchColumnTitle(1)}</span>
                    <span className={dupStyles.thHint}>{copy.matchColumnHintBest}</span>
                  </span>
                </th>
                <th scope="col">
                  <span className={dupStyles.thStack}>
                    <span className={dupStyles.thTitle}>{copy.matchColumnTitle(2)}</span>
                    <span className={dupStyles.thHint} aria-hidden>
                      &nbsp;
                    </span>
                  </span>
                </th>
                <th scope="col">
                  <span className={dupStyles.thStack}>
                    <span className={dupStyles.thTitle}>{copy.matchColumnTitle(3)}</span>
                    <span className={dupStyles.thHint} aria-hidden>
                      &nbsp;
                    </span>
                  </span>
                </th>
                <th scope="col" className={dupStyles.decisionHeader}>
                  <span className={dupStyles.thStack}>
                    <span className={dupStyles.thTitle}>{copy.colSameCustomer}</span>
                    <span className={dupStyles.thHint}>{copy.colSameCustomerHint}</span>
                  </span>
                </th>
              </tr>
            </thead>
            {sortedItems.map((item, index) => (
              <Fragment key={item.incomingId}>
                {index > 0 ? (
                  <tbody className={dupStyles.pairSpacer} aria-hidden>
                    <tr>
                      <td colSpan={8} />
                    </tr>
                  </tbody>
                ) : null}
                <DuplicatePairGroup
                  item={item}
                  copy={copy}
                  decision={decisions[item.incomingId]}
                  disabled={disabled}
                  targetProjectName={targetProjectName}
                  targetProjectHref={targetProjectHref}
                  targetProjectSlug={targetProjectSlug}
                  onDecisionChange={onDecisionChange}
                />
              </Fragment>
            ))}
          </table>
        </div>

        {uniqueRows > 0 ? (
          <details className={dupStyles.uniqueSection}>
            <summary>{copy.uniqueSectionTitle(uniqueRows)}</summary>
            <p>{copy.uniqueSectionBody(uniqueRows)}</p>
          </details>
        ) : null}
      </div>

      <p className={dupStyles.showingRows} aria-live="polite">
        {copy.showingGroups(1, sortedItems.length, sortedItems.length)}
      </p>
    </div>
  );
}
