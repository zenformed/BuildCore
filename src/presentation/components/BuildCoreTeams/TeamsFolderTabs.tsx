'use client';

import type { ReactElement } from 'react';
import { useMemo, useState } from 'react';
import { useDashboardMobileLayout } from '@/presentation/features/crmProjects/useDashboardMobileLayout';
import type { BuildCoreTeamsPageModel } from '@/presentation/features/buildCoreTeams/buildCoreTeamsViewModel';
import {
  buildTeamsFolderTabs,
  type TeamsFolderTabId,
} from '@/presentation/features/buildCoreTeams/teamsFolderTabModel';
import projectStyles from '../CrmProjectDetail/ProjectDetail.module.css';
import { BuildCoreBudgetPermissionsSection } from './BuildCoreBudgetPermissionsSection';
import { BuildCorePaymentPermissionsSection } from './BuildCorePaymentPermissionsSection';
import { BuildCoreTeamsMembersSection } from './BuildCoreTeamsMembersSection';
import { BuildCoreWorkflowTaskPermissionsSection } from './BuildCoreWorkflowTaskPermissionsSection';
import {
  TEAMS_SECTION_SELECT_LABEL_ID,
  TeamsSectionMobileSelector,
} from './TeamsSectionMobileSelector';
import styles from './BuildCoreTeams.module.css';

export type { TeamsFolderTabId } from '@/presentation/features/buildCoreTeams/teamsFolderTabModel';

export type TeamsFolderTabsProps = {
  readonly model: BuildCoreTeamsPageModel;
};

export function TeamsFolderTabs({ model }: TeamsFolderTabsProps): ReactElement {
  const [selectedTab, setSelectedTab] = useState<TeamsFolderTabId>('members');
  const isMobileLayout = useDashboardMobileLayout();
  const tabs = useMemo(() => buildTeamsFolderTabs(), []);

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
      {isMobileLayout ? (
        <TeamsSectionMobileSelector
          tabs={tabs}
          selectedTab={selectedTab}
          onSelectTab={setSelectedTab}
        />
      ) : (
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
      )}
      <div
        id="teams-folder-tabpanel"
        role="tabpanel"
        aria-labelledby={
          isMobileLayout ? TEAMS_SECTION_SELECT_LABEL_ID : `teams-folder-tab-${selectedTab}`
        }
        className={styles.teamsFolderTabPanel}
      >
        <div className={styles.teamsFolderTabPanelInner} data-teams-tab={selectedTab}>
          {renderTabPanel()}
        </div>
      </div>
    </div>
  );
}
