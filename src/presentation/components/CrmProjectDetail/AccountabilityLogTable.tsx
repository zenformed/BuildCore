'use client';

import type { ReactElement } from 'react';
import type { CrmAccountabilityAction, CrmTeamMemberRef } from '@/domain/crm';
import type { PipelineStage } from '@/domain/crm/pipelineStage';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { formatBuildCoreDisplayDateTime } from '@/platform/formatting/buildCoreDisplayDate';
import { formatStageLabel } from '@/presentation/features/crmProjects/crmProjectFormatters';
import { useResolvedTeamMemberRef } from '@/presentation/hooks/useResolvedTeamMemberRef';
import { TeamMemberAvatar } from './TeamMemberAvatar';
import styles from './ProjectDetail.module.css';

const EMPTY_VALUE = '—';

export function sortAccountabilityEntries(
  log: readonly CrmAccountabilityAction[]
): CrmAccountabilityAction[] {
  return [...log].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}

function formatDateTime(iso: string): string {
  const trimmed = iso.trim();
  if (!trimmed) {
    return EMPTY_VALUE;
  }
  return formatBuildCoreDisplayDateTime(trimmed);
}

function formatAccountabilityEvent(action: string): string {
  const event = action.split('—')[0]?.trim();
  return event || EMPTY_VALUE;
}

function formatAccountabilityEntity(
  stageSlug: CrmAccountabilityAction['stageSlug'],
  stages: readonly PipelineStage[] | null
): string {
  if (!stageSlug) {
    return EMPTY_VALUE;
  }
  const label = formatStageLabel(stageSlug, stages);
  return label.trim() || EMPTY_VALUE;
}

function formatAccountabilityDetails(action: string): string {
  return action.trim() || EMPTY_VALUE;
}

function AccountabilityUserCell({ actor }: { actor: CrmTeamMemberRef }): ReactElement {
  const resolved = useResolvedTeamMemberRef(actor) ?? actor;
  return (
    <>
      <TeamMemberAvatar member={resolved} />
      <span>{resolved.displayName}</span>
    </>
  );
}

function AccountabilityMobileUserValue({ actor }: { actor: CrmTeamMemberRef }): ReactElement {
  const resolved = useResolvedTeamMemberRef(actor) ?? actor;
  const displayName = resolved.displayName?.trim();

  if (!displayName) {
    return <span className={styles.workflowTaskMobileCardValue}>{EMPTY_VALUE}</span>;
  }

  return (
    <span className={styles.accountabilityMobileUserValue}>
      <TeamMemberAvatar member={resolved} />
      <span className={styles.workflowTaskMobileCardValue}>{displayName}</span>
    </span>
  );
}

export type AccountabilityLogMobileCardProps = {
  readonly entry: CrmAccountabilityAction;
  readonly stages?: readonly PipelineStage[] | null;
};

export function AccountabilityLogMobileCard({
  entry,
  stages = null,
}: AccountabilityLogMobileCardProps): ReactElement {
  const cols = content.projectDetail.accountability.columns;
  const eventText = formatAccountabilityEvent(entry.action);
  const entityText = formatAccountabilityEntity(entry.stageSlug, stages);
  const dateTimeText = formatDateTime(entry.at);
  const detailsText = formatAccountabilityDetails(entry.action);

  return (
    <article
      className={`${styles.card} ${styles.workflowTaskMobileCard} ${styles.accountabilityMobileCard}`}
      aria-label={`${cols.event}: ${eventText}`}
    >
      <div
        className={`${styles.workflowTaskMobileCardGrid2} ${styles.accountabilityMobileCardEventUserRow}`}
      >
        <div className={styles.workflowTaskMobileCardCell}>
          <span className={styles.projectInfoMobileLabel}>{cols.event}</span>
          <span className={styles.accountabilityMobileEventValue} title={eventText}>
            {eventText}
          </span>
        </div>
        <div
          className={`${styles.workflowTaskMobileCardCell} ${styles.workflowTaskMobileCardCell_right}`}
        >
          <span className={styles.projectInfoMobileLabel}>{cols.user}</span>
          <AccountabilityMobileUserValue actor={entry.actor} />
        </div>
      </div>
      <div className={styles.workflowTaskMobileCardGrid2}>
        <div className={styles.workflowTaskMobileCardCell}>
          <span className={styles.projectInfoMobileLabel}>{cols.entity}</span>
          <span className={styles.workflowTaskMobileCardValue}>{entityText}</span>
        </div>
        <div
          className={`${styles.workflowTaskMobileCardCell} ${styles.workflowTaskMobileCardCell_right}`}
        >
          <span className={styles.projectInfoMobileLabel}>{cols.dateTime}</span>
          <span className={styles.workflowTaskMobileCardValue}>{dateTimeText}</span>
        </div>
      </div>
      <div className={styles.workflowTaskMobileCardNotes}>
        <span className={styles.projectInfoMobileLabel}>{cols.details}</span>
        <span className={styles.workflowTaskMobileCardNotesText}>{detailsText}</span>
      </div>
    </article>
  );
}

export type AccountabilityLogMobileListProps = {
  readonly entries: readonly CrmAccountabilityAction[];
  readonly stages?: readonly PipelineStage[] | null;
};

export function AccountabilityLogMobileList({
  entries,
  stages = null,
}: AccountabilityLogMobileListProps): ReactElement {
  return (
    <div className={styles.accountabilityMobileList}>
      {entries.map((entry) => (
        <AccountabilityLogMobileCard key={entry.id} entry={entry} stages={stages} />
      ))}
    </div>
  );
}

export type AccountabilityLogTableProps = {
  entries: readonly CrmAccountabilityAction[];
  layout?: 'panel' | 'modal';
  stages?: readonly PipelineStage[] | null;
};

export function AccountabilityLogTable({
  entries,
  layout = 'panel',
  stages = null,
}: AccountabilityLogTableProps): ReactElement {
  const cols = content.projectDetail.accountability.columns;
  const gridClass =
    layout === 'modal'
      ? `${styles.accountabilityGrid} ${styles.accountabilityGrid_modal}`
      : styles.accountabilityGrid;

  return (
    <div className={styles.accountabilityTableWrap}>
      <div className={`${styles.tableHeader} ${gridClass}`} role="row">
        <span role="columnheader">{cols.dateTime}</span>
        <span role="columnheader">{cols.user}</span>
        <span role="columnheader">{cols.event}</span>
        <span role="columnheader">{cols.entity}</span>
        <span role="columnheader">{cols.details}</span>
      </div>
      {entries.map((entry) => (
        <div key={entry.id} className={`${styles.tableRow} ${gridClass}`} role="row">
          <span className={styles.accountabilityDate}>{formatDateTime(entry.at)}</span>
          <span className={styles.accountabilityUser}>
            <AccountabilityUserCell actor={entry.actor} />
          </span>
          <span className={styles.accountabilityEvent}>
            {entry.action.split('—')[0]?.trim() ?? entry.action}
          </span>
          <span>{entry.stageSlug ? formatStageLabel(entry.stageSlug, stages) : '—'}</span>
          <span
            className={
              layout === 'modal' ? styles.accountabilityDetails_modal : styles.accountabilityDetails
            }
          >
            {entry.action}
          </span>
        </div>
      ))}
    </div>
  );
}
