'use client';

import type { ReactElement } from 'react';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { BuildCoreWorkflowStagesSplitTab } from './BuildCoreWorkflowStagesSplitTab';
import { BuildCoreWorkflowSettingsAlertsTab } from './BuildCoreWorkflowSettingsAlertsTab';
import projectStyles from '../CrmProjectDetail/ProjectDetail.module.css';
import styles from './BuildCoreWorkflowSettings.module.css';

export function BuildCoreWorkflowSettingsSections(): ReactElement {
  const sectionCopy = content.workflowSettings.folderTabs;

  return (
    <div className={styles.workflowSettingsSections}>
      <section
        className={`${styles.workflowSettingsPanel} ${styles.workflowSettingsPanel_alerts}`}
        aria-labelledby="workflow-settings-alerts-heading"
      >
        <div className={styles.workflowSettingsPanelHeader}>
          <h2 id="workflow-settings-alerts-heading" className={projectStyles.detailPanelTitle}>
            {sectionCopy.alerts}
          </h2>
        </div>
        <div className={styles.workflowSettingsPanelBody}>
          <BuildCoreWorkflowSettingsAlertsTab />
        </div>
      </section>

      <section
        className={`${styles.workflowSettingsPanel} ${styles.workflowSettingsPanel_stages}`}
        aria-labelledby="workflow-settings-stages-heading"
      >
        <div className={styles.workflowSettingsPanelHeader}>
          <h2 id="workflow-settings-stages-heading" className={projectStyles.detailPanelTitle}>
            {sectionCopy.workflowStages}
          </h2>
        </div>
        <div
          className={`${styles.workflowSettingsPanelBody} ${styles.workflowSettingsPanelBody_scroll}`}
        >
          <BuildCoreWorkflowStagesSplitTab />
        </div>
      </section>
    </div>
  );
}
