'use client';

import type { ReactElement, ReactNode } from 'react';
import {
  LuBuilding2,
  LuChevronRight,
  LuCircleAlert,
  LuCircleCheck,
  LuFileSpreadsheet,
  LuInfo,
  LuListChecks,
  LuShieldCheck,
  LuTable2,
  LuUserRound,
  LuCopy,
} from 'react-icons/lu';
import type { CrmDuplicateTruncationMeta } from '@/domain/crm/identity';
import type { CrmImportColumnComposition } from '@/domain/crm/spreadsheetImportComposition';
import type { CrmImportMode } from '@/domain/crm/spreadsheetImportTypes';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import type {
  CrmImportInterviewScreen,
  CrmImportStructureChoice,
} from '@/presentation/features/crmImport/interview/interviewState';
import {
  DuplicateTruncationNotice,
  reviewTruncationCopyFromContent,
} from '@/presentation/features/crmImport/interview/DuplicateTruncationNotice';
import {
  compositionLabel,
  destinationImportingToLabel,
  resolveReviewReadiness,
  reviewEditTargetForSection,
  type ReviewReadinessTone,
  type ReviewSectionId,
} from '@/presentation/features/crmImport/interview/reviewPresentation';
import styles from '@/presentation/components/CrmImport/SpreadsheetImportWizard.module.css';

export type ReviewScreenGroupsSummary = {
  readonly created: number;
  readonly attached: number;
  readonly ignored: number;
};

export type ReviewScreenProps = {
  readonly launchMode: CrmImportMode;
  readonly effectiveMode: CrmImportMode;
  readonly multiProjectOrganization?: string | null;
  readonly fileName: string | null;
  readonly sheetName: string;
  readonly headerRowNumber: number;
  readonly structureChoice: CrmImportStructureChoice | null;
  readonly parentLabel: string | null;
  readonly headers: readonly string[];
  readonly projectComposition: CrmImportColumnComposition | null;
  readonly subprojectComposition: CrmImportColumnComposition | null;
  readonly subprojectNameExample: string | null;
  readonly sheetsCount?: number | null;
  readonly rowsCount: number;
  readonly fieldsMappedCount: number;
  readonly ignoredColumnsCount: number;
  readonly mappedColumnsCount: number;
  readonly keyFieldLabels: readonly string[];
  readonly keyFieldsRemainingCount: number;
  readonly issueCount: number;
  readonly blockingIssueCount: number;
  readonly warningIssueCount: number;
  readonly issueMessages?: readonly string[];
  readonly issueSections?: ReadonlySet<ReviewSectionId>;
  readonly groupsSummary: ReviewScreenGroupsSummary | null;
  readonly duplicateSummary?: {
    readonly totalIncomingRows: number;
    readonly rowsWithPossibleDuplicates: number;
    readonly sameCustomerCount: number;
    readonly differentCustomerCount: number;
    readonly existingMatchCount: number;
    readonly incomingToIncomingMatchCount: number;
    readonly truncated: boolean;
    readonly truncationMeta: CrmDuplicateTruncationMeta | null;
  } | null;
  readonly rowsToCreateCount?: number;
  readonly disabled?: boolean;
  readonly onEdit: (screen: CrmImportInterviewScreen) => void;
};

function readinessTone(props: ReviewScreenProps): ReviewReadinessTone {
  return resolveReviewReadiness({
    blockingCount: props.blockingIssueCount,
    warningCount: props.warningIssueCount,
  });
}

function SectionIcon({ section }: { readonly section: ReviewSectionId }): ReactElement {
  const size = 18;
  switch (section) {
    case 'spreadsheet':
      return <LuFileSpreadsheet size={size} aria-hidden />;
    case 'destination':
      return <LuBuilding2 size={size} aria-hidden />;
    case 'subprojectNames':
      return <LuUserRound size={size} aria-hidden />;
    case 'importedFields':
      return <LuListChecks size={size} aria-hidden />;
    case 'duplicates':
      return <LuCopy size={size} aria-hidden />;
    default:
      return <LuTable2 size={size} aria-hidden />;
  }
}

function ReviewRow({
  section,
  title,
  children,
  actionAriaLabel,
  tone,
  disabled,
  hideAction,
  onReview,
}: {
  readonly section: ReviewSectionId;
  readonly title: string;
  readonly children: ReactNode;
  readonly actionAriaLabel: string;
  readonly tone?: 'warning' | 'error';
  readonly disabled?: boolean;
  readonly hideAction?: boolean;
  readonly onReview: () => void;
}): ReactElement {
  const copy = content.crm.spreadsheetImport.interview.review;
  return (
    <div
      className={[
        styles.reviewRow,
        tone === 'warning' ? styles.reviewRowWarning : '',
        tone === 'error' ? styles.reviewRowError : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className={[styles.reviewIconContainer, styles[`reviewIcon_${section}`]].join(' ')}>
        <SectionIcon section={section} />
      </div>

      <div className={styles.reviewContent}>
        <div className={styles.reviewTitleRow}>
          <h3 className={styles.reviewTitle}>{title}</h3>
          {tone === 'warning' || tone === 'error' ? (
            <span className={styles.reviewRowStatus} aria-hidden>
              <LuCircleAlert size={14} />
            </span>
          ) : null}
        </div>
        {children}
      </div>

      {hideAction ? (
        <span className={styles.reviewActionSpacer} aria-hidden />
      ) : (
        <button
          type="button"
          className={styles.reviewAction}
          disabled={disabled}
          aria-label={actionAriaLabel}
          onClick={onReview}
        >
          <span>{copy.reviewAction}</span>
          <LuChevronRight size={15} aria-hidden />
        </button>
      )}
    </div>
  );
}

export function ReviewScreen(props: ReviewScreenProps): ReactElement {
  const {
    launchMode,
    effectiveMode,
    multiProjectOrganization = null,
    fileName,
    sheetName,
    headerRowNumber,
    structureChoice,
    parentLabel,
    headers,
    projectComposition,
    subprojectComposition,
    subprojectNameExample,
    sheetsCount = null,
    rowsCount,
    ignoredColumnsCount,
    mappedColumnsCount,
    keyFieldLabels,
    keyFieldsRemainingCount,
    issueCount,
    blockingIssueCount,
    warningIssueCount,
    issueMessages = [],
    issueSections,
    groupsSummary,
    duplicateSummary = null,
    rowsToCreateCount,
    disabled,
    onEdit,
  } = props;

  const copy = content.crm.spreadsheetImport.interview.review;
  const tone = readinessTone(props);
  const sectionTone = (section: ReviewSectionId): 'warning' | 'error' | undefined => {
    if (!issueSections?.has(section)) return undefined;
    return blockingIssueCount > 0 ? 'error' : 'warning';
  };

  const readyHeading =
    tone === 'blocking'
      ? copy.blockingHeading
      : tone === 'warning'
        ? copy.warningHeading
        : copy.readyHeading;
  const readyBody =
    tone === 'blocking'
      ? copy.blockingBody
      : tone === 'warning'
        ? copy.warningBody
        : copy.readyBody;

  const builtFrom =
    compositionLabel(headers, subprojectComposition) ??
    compositionLabel(headers, projectComposition);
  const importingTo = destinationImportingToLabel(structureChoice, launchMode, {
    oneProject: copy.oneProjectLabel,
    multipleProjects: copy.multipleProjectsLabel,
  });
  const projectDisplay =
    parentLabel ?? compositionLabel(headers, projectComposition) ?? '—';
  const displayFileName = fileName?.trim() || '—';
  const canReviewDestination = launchMode !== 'into_existing_parent';

  const jump = (section: ReviewSectionId): void => {
    const target = reviewEditTargetForSection(section, {
      launchMode,
      structureChoice,
      effectiveMode,
      multiProjectOrganization,
    });
    if (target) onEdit(target);
  };

  const whatNextBody =
    multiProjectOrganization === 'worksheet_per_project' ||
    (effectiveMode === 'master_hierarchy' && !parentLabel)
      ? copy.whatNextBodyMultiple(rowsToCreateCount ?? rowsCount)
      : copy.whatNextBody(rowsToCreateCount ?? rowsCount, projectDisplay);

  const showSheetsMetric = sheetsCount != null && sheetsCount > 0;

  return (
    <div className={[styles.wideWidth, styles.reviewScreen].join(' ')}>
      <div className={styles.reviewHeaderBlock}>
        <div
          className={[
            styles.reviewReadyBanner,
            tone === 'ready' ? styles.reviewReadyBannerReady : '',
            tone === 'warning' ? styles.reviewReadyBannerWarning : '',
            tone === 'blocking' ? styles.reviewReadyBannerBlocking : '',
          ]
            .filter(Boolean)
            .join(' ')}
          role="status"
          aria-live="polite"
        >
          <div className={styles.reviewReadyLeft}>
            <span
              className={[
                styles.reviewReadyIcon,
                tone === 'ready' ? styles.reviewReadyIconReady : '',
                tone === 'warning' ? styles.reviewReadyIconWarning : '',
                tone === 'blocking' ? styles.reviewReadyIconBlocking : '',
              ]
                .filter(Boolean)
                .join(' ')}
              aria-hidden
            >
              {tone === 'ready' ? <LuCircleCheck size={28} /> : <LuCircleAlert size={28} />}
            </span>
            <div className={styles.reviewReadyCopy}>
              <h2 className={styles.reviewReadyHeading}>{readyHeading}</h2>
              <p className={styles.reviewReadyBody}>{readyBody}</p>
            </div>
          </div>

          <div className={styles.reviewMetrics} aria-label={copy.metricsAriaLabel}>
            {showSheetsMetric ? (
              <div className={styles.reviewMetric}>
                <span className={[styles.reviewMetricIcon, styles.reviewMetricIconRows].join(' ')} aria-hidden>
                  <LuFileSpreadsheet size={16} />
                </span>
                <div>
                  <p className={styles.reviewMetricValue}>{sheetsCount.toLocaleString()}</p>
                  <p className={styles.reviewMetricLabel}>{copy.metricSheetsReady}</p>
                </div>
              </div>
            ) : null}
            <div className={styles.reviewMetric}>
              <span className={[styles.reviewMetricIcon, styles.reviewMetricIconRows].join(' ')} aria-hidden>
                <LuTable2 size={16} />
              </span>
              <div>
                <p className={styles.reviewMetricValue}>{rowsCount.toLocaleString()}</p>
                <p className={styles.reviewMetricLabel}>{copy.metricRowsReady}</p>
              </div>
            </div>
            <div className={styles.reviewMetric}>
              <span
                className={[
                  styles.reviewMetricIcon,
                  issueCount === 0 ? styles.reviewMetricIconIssuesOk : styles.reviewMetricIconIssuesWarn,
                ].join(' ')}
                aria-hidden
              >
                {issueCount === 0 ? <LuShieldCheck size={16} /> : <LuCircleAlert size={16} />}
              </span>
              <div>
                <p
                  className={styles.reviewMetricValue}
                  aria-live="polite"
                  aria-label={`${copy.issuesLiveRegionLabel}: ${issueCount}`}
                >
                  {issueCount.toLocaleString()}
                </p>
                <p className={styles.reviewMetricLabel}>{copy.metricIssuesFound}</p>
              </div>
            </div>
          </div>
        </div>

        {issueMessages.length > 0 ? (
          <div
            className={styles.reviewIssueRegion}
            aria-live="polite"
            role={blockingIssueCount > 0 ? 'alert' : 'status'}
          >
            <div className={styles.reviewIssuePanel}>
              <p className={styles.srOnly} id="review-issues-heading">
                {copy.issuesPanelHeading}
              </p>
              <ul className={styles.reviewIssueList} aria-labelledby="review-issues-heading">
                {issueMessages.map((message) => (
                  <li key={message} className={styles.reviewIssueItem}>
                    <LuCircleAlert size={14} aria-hidden />
                    <span>{message}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}
      </div>

      <div className={styles.reviewPanel}>
        <ReviewRow
          section="spreadsheet"
          title={`${copy.fileTitle}: ${displayFileName}`}
          actionAriaLabel={copy.reviewFileAria}
          tone={sectionTone('spreadsheet')}
          disabled={disabled}
          onReview={() => jump('spreadsheet')}
        >
          <p className={styles.reviewSecondary}>
            {showSheetsMetric
              ? copy.fileMetaLineMulti(sheetsCount!, rowsCount)
              : copy.fileMetaLine(sheetName || '—', headerRowNumber, rowsCount)}
          </p>
        </ReviewRow>

        <ReviewRow
          section="destination"
          title={`${copy.destinationTitle} › ${projectDisplay}`}
          actionAriaLabel={copy.reviewDestinationAria}
          tone={sectionTone('destination')}
          disabled={disabled}
          hideAction={!canReviewDestination}
          onReview={() => jump('destination')}
        >
          <p className={styles.reviewSecondary}>{importingTo}</p>
          {groupsSummary != null ? (
            <p className={styles.reviewSecondary}>
              {copy.groupsSummary(
                groupsSummary.created,
                groupsSummary.attached,
                groupsSummary.ignored
              )}
            </p>
          ) : null}
        </ReviewRow>

        <ReviewRow
          section="subprojectNames"
          title={`${copy.subprojectNamesTitle}: ${builtFrom ?? '—'}`}
          actionAriaLabel={copy.reviewSubprojectNamesAria}
          tone={sectionTone('subprojectNames')}
          disabled={disabled}
          onReview={() => jump('subprojectNames')}
        >
          <p className={styles.reviewSecondary}>
            {copy.exampleLabel}:{' '}
            {subprojectNameExample ? (
              <span className={styles.reviewExampleChip}>{subprojectNameExample}</span>
            ) : (
              '—'
            )}
          </p>
        </ReviewRow>

        <ReviewRow
          section="importedFields"
          title={copy.columnsMapped(mappedColumnsCount)}
          actionAriaLabel={copy.reviewMappedFieldsAria}
          tone={sectionTone('importedFields')}
          disabled={disabled}
          onReview={() => jump('importedFields')}
        >
          {ignoredColumnsCount > 0 ? (
            <p className={styles.reviewSecondary}>{copy.columnsIgnored(ignoredColumnsCount)}</p>
          ) : null}
          {keyFieldLabels.length > 0 ? (
            <p className={styles.reviewSecondary}>
              {copy.keyFieldsLabel}:{' '}
              <span className={styles.reviewKeyFieldChips}>
                {keyFieldLabels.map((label) => (
                  <span key={label} className={styles.reviewKeyFieldChip}>
                    {label}
                  </span>
                ))}
                {keyFieldsRemainingCount > 0 ? (
                  <span className={styles.reviewKeyFieldMore}>
                    {copy.moreFields(keyFieldsRemainingCount)}
                  </span>
                ) : null}
              </span>
            </p>
          ) : null}
        </ReviewRow>

        {duplicateSummary != null ? (
          <ReviewRow
            section="duplicates"
            title={`${copy.duplicatesTitle}: ${copy.duplicatesSummary(duplicateSummary)}`}
            actionAriaLabel={copy.duplicatesReviewAria}
            tone={duplicateSummary.truncated ? 'warning' : undefined}
            disabled={disabled}
            onReview={() => onEdit('duplicate_check')}
          >
            <DuplicateTruncationNotice
              meta={duplicateSummary.truncationMeta}
              copy={reviewTruncationCopyFromContent(copy)}
            />
          </ReviewRow>
        ) : null}
      </div>

      <div className={styles.reviewWhatNext}>
        <div className={styles.reviewWhatNextCopy}>
          <div className={styles.reviewWhatNextTitleRow}>
            <LuInfo size={16} aria-hidden />
            <p className={styles.reviewWhatNextTitle}>{copy.whatNextTitle}</p>
          </div>
          <p className={styles.reviewWhatNextBody}>{whatNextBody}</p>
          <p className={styles.reviewWhatNextRetention}>{copy.fileRetention}</p>
        </div>
        <div className={styles.reviewWhatNextArt} aria-hidden>
          <span className={styles.reviewWhatNextArtSheet}>
            <LuFileSpreadsheet size={22} />
          </span>
          <span className={styles.reviewWhatNextArtCheck}>
            <LuCircleCheck size={14} />
          </span>
        </div>
      </div>
    </div>
  );
}
