'use client';

import type { ReactElement } from 'react';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { useBuildCoreTeamsPage } from '@/presentation/features/buildCoreTeams/useBuildCoreTeamsPage';
import { BuildCoreTeamsAccessGate } from './BuildCoreTeamsAccessGate';
import { BuildCoreBudgetPermissionsSection } from './BuildCoreBudgetPermissionsSection';
import { BuildCorePaymentPermissionsSection } from './BuildCorePaymentPermissionsSection';
import { BuildCoreWorkflowTaskPermissionsSection } from './BuildCoreWorkflowTaskPermissionsSection';
import projectStyles from '../CrmProjectDetail/ProjectDetail.module.css';
import styles from './BuildCoreTeams.module.css';

function BuildCoreTeamsDashboardContent(): ReactElement {
  const { model, isLoading, loadError } = useBuildCoreTeamsPage();
  const copy = content.teams;

  if (isLoading) {
    return <p className={styles.loading}>{copy.loading}</p>;
  }

  if (loadError) {
    return <p className={styles.error}>{loadError ?? copy.loadError}</p>;
  }

  return (
    <div className={projectStyles.pageShell} data-buildcore-teams-page>
      <header className={projectStyles.detailHeader}>
        <div className={projectStyles.detailHeaderMain}>
          <div className={projectStyles.titleBlock}>
            <nav className={projectStyles.breadcrumb} aria-label="Breadcrumb">
              <span className={projectStyles.breadcrumbMuted}>Organization</span>
              <span className={projectStyles.breadcrumbSep} aria-hidden>
                /
              </span>
              <span className={projectStyles.breadcrumbCurrent}>{copy.title}</span>
            </nav>
            <h1 className={projectStyles.title}>{copy.title}</h1>
          </div>
        </div>
      </header>

      <div className={styles.pageBody}>
        <p className={styles.architectureNote}>{copy.architectureNote}</p>

        <div className={styles.teamsMainColumns}>
          <div className={styles.membersColumn}>
            <section
              className={`${projectStyles.card} ${styles.tableWrap}`}
              aria-labelledby="teams-members-table-heading"
            >
              <h2 id="teams-members-table-heading" className={projectStyles.cardTitle}>
                {copy.table.title}
              </h2>
              <div
                className={styles.tableScroll}
                role="region"
                aria-label={copy.table.regionAriaLabel}
              >
                {model.rows.length === 0 ? (
                  <p className={styles.empty}>{copy.table.empty}</p>
                ) : (
                  <table className={styles.membersTable}>
                    <thead>
                      <tr>
                        <th scope="col">{copy.table.name}</th>
                        <th scope="col">{copy.table.email}</th>
                        <th scope="col">{copy.table.organizationRole}</th>
                        <th scope="col">{copy.table.buildCoreAccess}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {model.rows.map((row) => (
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
                                ? copy.accessStatus.enabled
                                : copy.accessStatus.notConfigured}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </section>
          </div>

          <div className={styles.permissionsColumn}>
            <BuildCoreWorkflowTaskPermissionsSection enabled />
            <BuildCorePaymentPermissionsSection enabled />
            <BuildCoreBudgetPermissionsSection enabled />
          </div>
        </div>
      </div>
    </div>
  );
}

export function BuildCoreTeamsDashboard(): ReactElement {
  return (
    <BuildCoreTeamsAccessGate>
      <BuildCoreTeamsDashboardContent />
    </BuildCoreTeamsAccessGate>
  );
}
