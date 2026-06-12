'use client';

import type { ReactElement } from 'react';
import { useMemo, useState } from 'react';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { BuildCoreWorkflowStagesSplitTab } from './BuildCoreWorkflowStagesSplitTab';
import { BuildCoreWorkflowSettingsAlertsTab } from './BuildCoreWorkflowSettingsAlertsTab';
import projectStyles from '../CrmProjectDetail/ProjectDetail.module.css';
import styles from './BuildCoreWorkflowSettings.module.css';

export type WorkflowSettingsFolderTabId = 'workflowStages' | 'alerts';

type FolderTabDef = {
  readonly id: WorkflowSettingsFolderTabId;
  readonly label: string;
};

export function BuildCoreWorkflowSettingsFolderTabs(): ReactElement {
  const [selectedTab, setSelectedTab] = useState<WorkflowSettingsFolderTabId>('workflowStages');

  const tabs = useMemo((): readonly FolderTabDef[] => {
    const tabCopy = content.workflowSettings.folderTabs;
    return [
      { id: 'workflowStages', label: tabCopy.workflowStages },
      { id: 'alerts', label: tabCopy.alerts },
    ];
  }, []);

  const renderTabPanel = (): ReactElement => {
    switch (selectedTab) {
      case 'workflowStages':
        return <BuildCoreWorkflowStagesSplitTab />;
      case 'alerts':
        return <BuildCoreWorkflowSettingsAlertsTab />;
      default: {
        const _exhaustive: never = selectedTab;
        return _exhaustive;
      }
    }
  };

  return (
    <div className={styles.workflowSettingsFolderTabs} data-workflow-settings-tab={selectedTab}>
      <div className={projectStyles.folderTabList} role="tablist" aria-label="Workflow settings sections">
        {tabs.map((tab) => {
          const isActive = tab.id === selectedTab;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`workflow-settings-tab-${tab.id}`}
              aria-selected={isActive}
              aria-controls="workflow-settings-tabpanel"
              tabIndex={isActive ? 0 : -1}
              className={isActive ? projectStyles.folderTabActive : projectStyles.folderTab}
              onClick={() => setSelectedTab(tab.id)}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      <div
        id="workflow-settings-tabpanel"
        role="tabpanel"
        aria-labelledby={`workflow-settings-tab-${selectedTab}`}
        className={styles.workflowSettingsTabPanel}
      >
        <div
          className={styles.workflowSettingsTabPanelInner}
          data-workflow-settings-tab={selectedTab}
        >
          {renderTabPanel()}
        </div>
      </div>
    </div>
  );
}
