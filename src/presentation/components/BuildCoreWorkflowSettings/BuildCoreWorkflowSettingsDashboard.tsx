'use client';

import type { ReactElement } from 'react';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { useBuildCorePipelineStages } from '@/presentation/providers/BuildCorePipelineStagesProvider';
import { BuildCoreWorkflowSettingsAccessGate } from './BuildCoreWorkflowSettingsAccessGate';
import { BuildCoreWorkflowSettingsSections } from './BuildCoreWorkflowSettingsSections';
import projectStyles from '../CrmProjectDetail/ProjectDetail.module.css';
import stageStyles from '../BuildCoreWorkflowStages/BuildCoreWorkflowStages.module.css';
import styles from './BuildCoreWorkflowSettings.module.css';

function BuildCoreWorkflowSettingsDashboardContent(): ReactElement {
  const { isLoading, loadError } = useBuildCorePipelineStages();
  const copy = content.workflowSettings;

  if (isLoading) {
    return (
      <div
        className={`${projectStyles.pageShell} ${stageStyles.pageShell} ${styles.pageShell}`}
        data-buildcore-workflow-settings-page
      >
        <div className={styles.workflowSettingsPageContainer}>
          <p className={stageStyles.loading}>{copy.loading}</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div
        className={`${projectStyles.pageShell} ${stageStyles.pageShell} ${styles.pageShell}`}
        data-buildcore-workflow-settings-page
      >
        <div className={styles.workflowSettingsPageContainer}>
          <p className={stageStyles.error}>{loadError ?? copy.loadError}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`${projectStyles.pageShell} ${stageStyles.pageShell} ${styles.pageShell}`}
      data-buildcore-workflow-settings-page
    >
      <div className={styles.workflowSettingsPageContainer}>
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

        <div className={`${projectStyles.pageBodyOverview} ${styles.pageBody}`}>
          <p className={styles.pageIntroNote}>{copy.introNote}</p>
          <BuildCoreWorkflowSettingsSections />
        </div>
      </div>
    </div>
  );
}

export function BuildCoreWorkflowSettingsDashboard(): ReactElement {
  return (
    <BuildCoreWorkflowSettingsAccessGate>
      <BuildCoreWorkflowSettingsDashboardContent />
    </BuildCoreWorkflowSettingsAccessGate>
  );
}
