'use client';

import type { ChangeEvent, ReactElement } from 'react';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import type {
  TeamsFolderTabDef,
  TeamsFolderTabId,
} from '@/presentation/features/buildCoreTeams/teamsFolderTabModel';
import formStyles from '@/presentation/components/CrmProjects/CreateCrmProjectDrawer.module.css';
import projectStyles from '../CrmProjectDetail/ProjectDetail.module.css';
import styles from './BuildCoreTeams.module.css';

const SECTION_SELECT_ID = 'teams-section-select';

export const TEAMS_SECTION_SELECT_LABEL_ID = `${SECTION_SELECT_ID}-label`;

export type TeamsSectionMobileSelectorProps = {
  readonly tabs: readonly TeamsFolderTabDef[];
  readonly selectedTab: TeamsFolderTabId;
  readonly onSelectTab: (tabId: TeamsFolderTabId) => void;
};

export function TeamsSectionMobileSelector({
  tabs,
  selectedTab,
  onSelectTab,
}: TeamsSectionMobileSelectorProps): ReactElement {
  const copy = content.teams.mobileControls;

  const handleChange = (event: ChangeEvent<HTMLSelectElement>): void => {
    onSelectTab(event.target.value as TeamsFolderTabId);
  };

  return (
    <div className={`${projectStyles.folderTabMobileSelector} ${styles.teamsMobileSectionSelector}`}>
      <label
        htmlFor={SECTION_SELECT_ID}
        id={TEAMS_SECTION_SELECT_LABEL_ID}
        className={projectStyles.folderTabMobileSelectorLabel}
      >
        {copy.sectionLabel}
      </label>
      <select
        id={SECTION_SELECT_ID}
        className={`${formStyles.select} ${projectStyles.folderTabMobileSelect}`}
        value={selectedTab}
        onChange={handleChange}
        aria-label={copy.sectionAriaLabel}
      >
        {tabs.map((tab) => (
          <option key={tab.id} value={tab.id}>
            {tab.label}
          </option>
        ))}
      </select>
    </div>
  );
}
