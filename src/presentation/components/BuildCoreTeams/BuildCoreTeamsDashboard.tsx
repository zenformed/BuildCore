'use client';

import type { ReactElement } from 'react';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { useBuildCoreTeamsPage } from '@/presentation/features/buildCoreTeams/useBuildCoreTeamsPage';
import { BuildCoreTeamsAccessGate } from './BuildCoreTeamsAccessGate';
import { TeamsFolderTabs } from './TeamsFolderTabs';
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
    <div className={`${projectStyles.pageShell} ${styles.teamsPageShell}`} data-buildcore-teams-page>
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
        <TeamsFolderTabs model={model} />
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
