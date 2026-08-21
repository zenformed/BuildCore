'use client';

import type { ReactElement } from 'react';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { useDashboardMobileLayout } from '@/presentation/features/crmProjects/useDashboardMobileLayout';
import type { BuildCoreTeamMemberRow } from '@/presentation/features/buildCoreTeams/buildCoreTeamsViewModel';
import projectStyles from '../CrmProjectDetail/ProjectDetail.module.css';
import { BuildCoreTeamMemberMobileCard } from './BuildCoreTeamMemberMobileCard';
import type { useBuildCoreProjectMemberAccess } from '@/presentation/features/buildCoreTeams/useBuildCoreProjectMemberAccess';
import styles from './BuildCoreTeams.module.css';

export type BuildCoreTeamsMembersSectionProps = {
  readonly rows: readonly BuildCoreTeamMemberRow[];
  readonly projectMemberAccess: ReturnType<typeof useBuildCoreProjectMemberAccess>;
};

export function BuildCoreTeamsMembersSection({
  rows,
  projectMemberAccess,
}: BuildCoreTeamsMembersSectionProps): ReactElement {
  const copy = content.teams.table;
  const isMobileLayout = useDashboardMobileLayout();

  if (isMobileLayout) {
    return (
      <section
        className={`${projectStyles.card} ${styles.membersTabPanel} ${styles.membersTabPanel_mobile}`}
        aria-label={copy.title}
      >
        {projectMemberAccess.canManage ? (
          <p className={styles.memberProjectAccessNote}>
            Project access applies to Projects and their related CRM records. It does not change
            workflow-task, payment, or budget permissions.
          </p>
        ) : null}
        {rows.length === 0 ? (
          <p className={styles.empty}>{copy.empty}</p>
        ) : (
          <div className={styles.memberMobileList}>
            {rows.map((row) => (
              <BuildCoreTeamMemberMobileCard key={row.id} row={row} projectMemberAccess={projectMemberAccess} />
            ))}
          </div>
        )}
      </section>
    );
  }

  return (
    <section className={`${styles.membersTabPanel} ${styles.membersTableContainer}`} role="region" aria-label={copy.regionAriaLabel}>
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
              {projectMemberAccess.canManage ? <th scope="col">Project access</th> : null}
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
                  {projectMemberAccess.canManage ? (
                    <td>
                      {row.organizationRole === 'owner' || row.organizationRole === 'admin' ? (
                        <span className={`${styles.accessBadge} ${styles.accessBadge_enabled}`}>All organization projects</span>
                      ) : row.projectAccessScope == null || row.membershipStatus !== 'active' ? (
                        '—'
                      ) : (
                        <select
                          className={styles.memberProjectVisibilitySelect}
                          value={row.projectAccessScope}
                          disabled={projectMemberAccess.savingUserId === row.userId}
                          aria-label={`Project access for ${row.name}`}
                          onChange={(event) => void projectMemberAccess.save(
                            row.userId,
                            event.target.value as 'all' | 'assigned_only'
                          )}
                        >
                          <option value="all">All organization projects</option>
                          <option value="assigned_only">Only assigned projects</option>
                        </select>
                      )}
                    </td>
                  ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {projectMemberAccess.canManage ? (
        <p className={styles.memberProjectAccessNote}>
          Project access applies to Projects and their related CRM records. It does not change
          workflow-task, payment, or budget permissions.
        </p>
      ) : null}
      {projectMemberAccess.canManage && projectMemberAccess.isLoading ? <p className={styles.loading}>Loading project visibility…</p> : null}
      {projectMemberAccess.canManage && projectMemberAccess.loadError ? <p className={styles.error}>{projectMemberAccess.loadError}</p> : null}
      {projectMemberAccess.statusMessage ? <p className={`${styles.permissionStatusLine} ${projectMemberAccess.statusKind === 'success' ? styles.permissionStatusSuccess : styles.permissionStatusError}`} role="status">{projectMemberAccess.statusMessage}</p> : null}
    </section>
  );
}
