'use client';

import type { ReactElement } from 'react';
import { useMemo, useState } from 'react';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import type { BuildCoreTeamsPageModel } from '@/presentation/features/buildCoreTeams/buildCoreTeamsViewModel';
import projectStyles from '../CrmProjectDetail/ProjectDetail.module.css';
import { BuildCoreBudgetPermissionsSection } from './BuildCoreBudgetPermissionsSection';
import { BuildCorePaymentPermissionsSection } from './BuildCorePaymentPermissionsSection';
import { BuildCoreTeamsMembersSection } from './BuildCoreTeamsMembersSection';
import { BuildCoreWorkflowTaskPermissionsSection } from './BuildCoreWorkflowTaskPermissionsSection';
import styles from './BuildCoreTeams.module.css';

export type TeamsFolderTabId = 'members' | 'taskPermissions' | 'paymentPermissions' | 'budgetPermissions';

type FolderTabDef = {
  readonly id: TeamsFolderTabId;
  readonly label: string;
};

export type TeamsFolderTabsProps = {
  readonly model: BuildCoreTeamsPageModel;
};

export function TeamsFolderTabs({ model }: TeamsFolderTabsProps): ReactElement {
  const [selectedTab, setSelectedTab] = useState<TeamsFolderTabId>('members');

  const tabs = useMemo((): readonly FolderTabDef[] => {
    const tabCopy = content.teams.folderTabs;
    return [
      { id: 'members', label: tabCopy.members },
      { id: 'taskPermissions', label: tabCopy.taskPermissions },
      { id: 'paymentPermissions', label: tabCopy.paymentPermissions },
      { id: 'budgetPermissions', label: tabCopy.budgetPermissions },
    ];
  }, []);

  const renderTabPanel = (): ReactElement => {
    switch (selectedTab) {
      case 'members':
        return <BuildCoreTeamsMembersSection rows={model.rows} />;
      case 'taskPermissions':
        return <BuildCoreWorkflowTaskPermissionsSection enabled layout="tabPanel" />;
      case 'paymentPermissions':
        return <BuildCorePaymentPermissionsSection enabled layout="tabPanel" />;
      case 'budgetPermissions':
        return <BuildCoreBudgetPermissionsSection enabled layout="tabPanel" />;
      default: {
        const _exhaustive: never = selectedTab;
        return _exhaustive;
      }
    }
  };

  return (
    <div className={styles.teamsFolderTabs} data-teams-tab={selectedTab}>
      <div className={projectStyles.folderTabList} role="tablist" aria-label="Team sections">
        {tabs.map((tab) => {
          const isActive = tab.id === selectedTab;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`teams-folder-tab-${tab.id}`}
              aria-selected={isActive}
              aria-controls="teams-folder-tabpanel"
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
        id="teams-folder-tabpanel"
        role="tabpanel"
        aria-labelledby={`teams-folder-tab-${selectedTab}`}
        className={styles.teamsFolderTabPanel}
      >
        <div className={styles.teamsFolderTabPanelInner} data-teams-tab={selectedTab}>
          {renderTabPanel()}
        </div>
      </div>
    </div>
  );
}
