'use client';

import type { ReactElement } from 'react';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import type { BuildCoreTeamMemberRow } from '@/presentation/features/buildCoreTeams/buildCoreTeamsViewModel';
import projectStyles from '../CrmProjectDetail/ProjectDetail.module.css';
import styles from './BuildCoreTeams.module.css';

export type BuildCoreTeamsMembersSectionProps = {
  readonly rows: readonly BuildCoreTeamMemberRow[];
};

export function BuildCoreTeamsMembersSection({
  rows,
}: BuildCoreTeamsMembersSectionProps): ReactElement {
  const copy = content.teams.table;

  return (
    <section
      className={`${projectStyles.card} ${styles.tableWrap} ${styles.membersTabPanel}`}
      aria-label={copy.title}
    >
      <div className={styles.tableScroll} role="region" aria-label={copy.regionAriaLabel}>
        {rows.length === 0 ? (
          <p className={styles.empty}>{copy.empty}</p>
        ) : (
          <table className={styles.membersTable}>
            <thead>
              <tr>
                <th scope="col">{copy.name}</th>
                <th scope="col">{copy.email}</th>
                <th scope="col">{copy.organizationRole}</th>
                <th scope="col">{copy.buildCoreAccess}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className={styles.memberName}>{row.name}</td>
                  <td className={styles.memberEmail}>{row.email ?? '—'}</td>
                  <td>{row.organizationRoleLabel}</td>
                  <td>
                    <span
                      className={`${styles.accessBadge} ${
                        row.buildCoreAccessStatus === 'enabled'
                          ? styles.accessBadge_enabled
                          : styles.accessBadge_notConfigured
                      }`}
                    >
                      {row.buildCoreAccessStatus === 'enabled'
                        ? content.teams.accessStatus.enabled
                        : content.teams.accessStatus.notConfigured}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
