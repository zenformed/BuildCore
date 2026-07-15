'use client';

import type { ReactElement } from 'react';
import { BuildCoreWorkflowStagesList } from '../BuildCoreWorkflowStages/BuildCoreWorkflowStagesList';
import styles from './BuildCoreWorkflowSettings.module.css';

export function BuildCoreWorkflowStagesSplitTab(): ReactElement {
  return (
    <div className={styles.workflowStagesSplitTab}>
      <div className={styles.workflowStagesSplitColumn}>
        <BuildCoreWorkflowStagesList
          scope="project"
          embeddedInTab
          entityTerminologyKey="project"
          headingId="workflow-project-stages-heading"
        />
      </div>
      <div className={styles.workflowStagesSplitColumn}>
        <BuildCoreWorkflowStagesList
          scope="subproject"
          embeddedInTab
          entityTerminologyKey="subproject"
          headingId="workflow-subproject-stages-heading"
        />
      </div>
    </div>
  );
}
