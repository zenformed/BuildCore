'use client';

import type { ReactElement } from 'react';
import { ProjectDetailFolderTabs } from './ProjectDetailFolderTabs';
import styles from './ProjectDetail.module.css';

export function ProjectOverviewContent(): ReactElement {
  return (
    <div className={styles.detailPanelsScroll}>
      <ProjectDetailFolderTabs />
    </div>
  );
}
