'use client';

import type { ChangeEvent, ReactElement } from 'react';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import formStyles from '@/presentation/components/CrmProjects/CreateCrmProjectDrawer.module.css';
import type {
  ProjectDetailFolderTabDef,
  ProjectDetailFolderTabId,
} from '@/presentation/features/crmProjectDetail/projectDetailFolderTabs';
import styles from './ProjectDetail.module.css';

const SELECT_ID = 'project-folder-tab-select';

export const PROJECT_FOLDER_TAB_SELECT_LABEL_ID = `${SELECT_ID}-label`;

export type ProjectDetailFolderTabSelectorProps = {
  readonly tabs: readonly ProjectDetailFolderTabDef[];
  readonly selectedTab: ProjectDetailFolderTabId;
  readonly onSelectTab: (tabId: ProjectDetailFolderTabId) => void;
};

export function ProjectDetailFolderTabSelector({
  tabs,
  selectedTab,
  onSelectTab,
}: ProjectDetailFolderTabSelectorProps): ReactElement {
  const copy = content.projectDetail.folderTabs;

  const handleChange = (event: ChangeEvent<HTMLSelectElement>): void => {
    onSelectTab(event.target.value as ProjectDetailFolderTabId);
  };

  return (
    <div className={styles.folderTabMobileSelector}>
      <label
        htmlFor={SELECT_ID}
        id={PROJECT_FOLDER_TAB_SELECT_LABEL_ID}
        className={styles.folderTabMobileSelectorLabel}
      >
        {copy.sectionsLabel}
      </label>
      <select
        id={SELECT_ID}
        className={`${formStyles.select} ${styles.folderTabMobileSelect}`}
        value={selectedTab}
        onChange={handleChange}
        aria-label={copy.selectAriaLabel}
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
