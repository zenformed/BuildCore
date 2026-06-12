'use client';

import type { ReactElement } from 'react';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { useBuildCoreWorkflowStagesPage } from '@/presentation/features/buildCoreWorkflowStages/useBuildCoreWorkflowStagesPage';
import { BuildCoreWorkflowStagesAccessGate } from './BuildCoreWorkflowStagesAccessGate';
import { BuildCoreWorkflowStagesList } from './BuildCoreWorkflowStagesList';
import projectStyles from '../CrmProjectDetail/ProjectDetail.module.css';
import styles from './BuildCoreWorkflowStages.module.css';

function BuildCoreWorkflowStagesDashboardContent(): ReactElement {
  const { isLoading, loadError } = useBuildCoreWorkflowStagesPage('project');
  const copy = content.workflowStages;

  if (isLoading) {
    return <p className={styles.loading}>{copy.loading}</p>;
  }

  if (loadError) {
    return <p className={styles.error}>{loadError ?? copy.loadError}</p>;
  }

  return (
    <div className={`${projectStyles.pageShell} ${styles.pageShell}`} data-buildcore-workflow-stages-page>
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
        <BuildCoreWorkflowStagesList scope="project" />
      </div>
    </div>
  );
}

export function BuildCoreWorkflowStagesDashboard(): ReactElement {
  return (
    <BuildCoreWorkflowStagesAccessGate>
      <BuildCoreWorkflowStagesDashboardContent />
    </BuildCoreWorkflowStagesAccessGate>
  );
}
