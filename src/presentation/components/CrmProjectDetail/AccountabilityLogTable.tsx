'use client';

import type { ReactElement } from 'react';
import type { CrmAccountabilityAction, CrmTeamMemberRef } from '@/domain/crm';
import type { PipelineStage } from '@/domain/crm/pipelineStage';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { formatStageLabel } from '@/presentation/features/crmProjects/crmProjectFormatters';
import { useResolvedTeamMemberRef } from '@/presentation/hooks/useResolvedTeamMemberRef';
import { TeamMemberAvatar } from './TeamMemberAvatar';
import styles from './ProjectDetail.module.css';

export function sortAccountabilityEntries(
  log: readonly CrmAccountabilityAction[]
): CrmAccountabilityAction[] {
  return [...log].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
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
