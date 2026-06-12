'use client';

import type { ReactElement } from 'react';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { BuildCoreWorkflowStagesList } from '../BuildCoreWorkflowStages/BuildCoreWorkflowStagesList';
import styles from './BuildCoreWorkflowSettings.module.css';

export function BuildCoreWorkflowStagesSplitTab(): ReactElement {
  const columnCopy = content.workflowSettings.stageColumns;

  return (
    <div className={styles.workflowStagesSplitTab}>
      <div className={styles.workflowStagesSplitColumn}>
        <BuildCoreWorkflowStagesList
          scope="project"
          embeddedInTab
          listTitle={columnCopy.projectStages}
          headingId="workflow-project-stages-heading"
        />
      </div>
      <div className={styles.workflowStagesSplitColumn}>
        <BuildCoreWorkflowStagesList
          scope="subproject"
          embeddedInTab
          listTitle={columnCopy.subprojectStages}
          headingId="workflow-subproject-stages-heading"
        />
      </div>
    </div>
  );
}
