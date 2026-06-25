'use client';

import type { ReactElement } from 'react';
import { useMemo, useState } from 'react';
import { useDashboardMobileLayout } from '@/presentation/features/crmProjects/useDashboardMobileLayout';
import type { BuildCoreTeamsPageModel } from '@/presentation/features/buildCoreTeams/buildCoreTeamsViewModel';
import {
  buildTeamsFolderTabs,
  type TeamsDesktopNavId,
  type TeamsFolderTabId,
} from '@/presentation/features/buildCoreTeams/teamsFolderTabModel';
import { BuildCoreBudgetPermissionsSection } from './BuildCoreBudgetPermissionsSection';
import { BuildCorePaymentPermissionsSection } from './BuildCorePaymentPermissionsSection';
import { BuildCoreTeamsMembersSection } from './BuildCoreTeamsMembersSection';
import { BuildCoreWorkflowTaskPermissionsSection } from './BuildCoreWorkflowTaskPermissionsSection';
import {
  TEAMS_SECTION_SELECT_LABEL_ID,
  TeamsSectionMobileSelector,
} from './TeamsSectionMobileSelector';
import { TeamsPermissionsPanel } from './TeamsPermissionsPanel';
import { TeamsSidebarNav } from './TeamsSidebarNav';
import styles from './BuildCoreTeams.module.css';

export type { TeamsFolderTabId } from '@/presentation/features/buildCoreTeams/teamsFolderTabModel';

export type TeamsFolderTabsProps = {
  readonly model: BuildCoreTeamsPageModel;
};

function renderMobileTabPanel(
  selectedTab: TeamsFolderTabId,
  model: BuildCoreTeamsPageModel
): ReactElement {
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
}

function renderDesktopContent(
  selectedNav: TeamsDesktopNavId,
  model: BuildCoreTeamsPageModel
): ReactElement {
  if (selectedNav === 'members') {
    return <BuildCoreTeamsMembersSection rows={model.rows} />;
  }
  return <TeamsPermissionsPanel />;
}

export function TeamsFolderTabs({ model }: TeamsFolderTabsProps): ReactElement {
  const isMobileLayout = useDashboardMobileLayout();
  const [selectedTab, setSelectedTab] = useState<TeamsFolderTabId>('members');
  const [selectedNav, setSelectedNav] = useState<TeamsDesktopNavId>('members');
  const mobileTabs = useMemo(() => buildTeamsFolderTabs(), []);

  if (isMobileLayout) {
    return (
      <div className={styles.teamsFolderTabs} data-teams-tab={selectedTab}>
        <TeamsSectionMobileSelector
          tabs={mobileTabs}
          selectedTab={selectedTab}
          onSelectTab={setSelectedTab}
        />
        <div
          id="teams-folder-tabpanel"
          role="tabpanel"
          aria-labelledby={TEAMS_SECTION_SELECT_LABEL_ID}
          className={styles.teamsFolderTabPanel}
        >
          <div className={styles.teamsFolderTabPanelInner} data-teams-tab={selectedTab}>
            {renderMobileTabPanel(selectedTab, model)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.teamsPageLayout} data-teams-nav={selectedNav}>
      <TeamsSidebarNav selectedNav={selectedNav} onSelectNav={setSelectedNav} />
      <div
        className={styles.teamsPageContent}
        role="region"
        aria-label={selectedNav === 'members' ? 'Members' : 'Permissions'}
      >
        {renderDesktopContent(selectedNav, model)}
      </div>
    </div>
  );
}
