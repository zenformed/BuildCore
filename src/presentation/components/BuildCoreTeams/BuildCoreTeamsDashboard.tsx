'use client';

import type { ReactElement } from 'react';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { useBuildCoreTeamsPage } from '@/presentation/features/buildCoreTeams/useBuildCoreTeamsPage';
import projectStyles from '../CrmProjectDetail/ProjectDetail.module.css';
import styles from './BuildCoreTeams.module.css';

export function BuildCoreTeamsDashboard(): ReactElement {
  const { model, isLoading, loadError } = useBuildCoreTeamsPage();
  const copy = content.teams;

  if (isLoading) {
    return <p className={styles.loading}>{copy.loading}</p>;
  }

  if (loadError) {
    return <p className={styles.error}>{loadError ?? copy.loadError}</p>;
  }

  if (!model.canViewTeamMembers) {
    return <p className={styles.noAccess}>{copy.noAccess}</p>;
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

        <div className={styles.sectionGrid}>
          <section className={projectStyles.card} aria-labelledby="teams-org-membership-heading">
            <h2 id="teams-org-membership-heading" className={projectStyles.cardTitle}>
              {copy.sections.organizationMembership}
            </h2>
            <p className={projectStyles.cardHelper}>{copy.sections.organizationMembershipHint}</p>
          </section>
          <section className={projectStyles.card} aria-labelledby="teams-buildcore-access-heading">
            <h2 id="teams-buildcore-access-heading" className={projectStyles.cardTitle}>
              {copy.sections.buildCoreAccess}
            </h2>
            <p className={projectStyles.cardHelper}>{copy.sections.buildCoreAccessHint}</p>
          </section>
          <section className={projectStyles.card} aria-labelledby="teams-buildcore-permissions-heading">
            <h2 id="teams-buildcore-permissions-heading" className={projectStyles.cardTitle}>
              {copy.sections.buildCorePermissions}
            </h2>
            <p className={projectStyles.cardHelper}>{copy.sections.buildCorePermissionsHint}</p>
            <p className={styles.placeholderCardBody}>{copy.placeholders.permissionsComingSoon}</p>
          </section>
          <section className={projectStyles.card} aria-labelledby="teams-assignment-permissions-heading">
            <h2 id="teams-assignment-permissions-heading" className={projectStyles.cardTitle}>
              {copy.sections.assignmentPermissions}
            </h2>
            <p className={projectStyles.cardHelper}>{copy.sections.assignmentPermissionsHint}</p>
            <p className={styles.placeholderCardBody}>{copy.placeholders.assignmentComingSoon}</p>
          </section>
        </div>

        <section
          className={`${projectStyles.card} ${styles.tableWrap}`}
          aria-labelledby="teams-members-table-heading"
        >
          <h2 id="teams-members-table-heading" className={projectStyles.cardTitle}>
            {copy.table.title}
          </h2>
          <div className={styles.tableScroll} role="region" aria-label={copy.table.regionAriaLabel}>
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
                    <th scope="col">{copy.table.buildCoreRole}</th>
                    <th scope="col">{copy.table.actions}</th>
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
                      <td>{row.buildCoreRolePlaceholder}</td>
                      <td>
                        <span className={styles.actionsPlaceholder}>
                          {copy.placeholders.actionsComingSoon}
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
    </div>
  );
}
