'use client';

import type { ReactElement } from 'react';
import { BuildCoreBudgetPermissionsSection } from './BuildCoreBudgetPermissionsSection';
import { BuildCorePaymentPermissionsSection } from './BuildCorePaymentPermissionsSection';
import { BuildCoreWorkflowTaskPermissionsSection } from './BuildCoreWorkflowTaskPermissionsSection';
import styles from './BuildCoreTeams.module.css';

export function TeamsPermissionsPanel(): ReactElement {
  return (
    <div className={styles.teamsPermissionsPanel}>
      <BuildCoreWorkflowTaskPermissionsSection enabled layout="stackedCard" />
      <BuildCorePaymentPermissionsSection enabled layout="stackedCard" />
      <BuildCoreBudgetPermissionsSection enabled layout="stackedCard" />
    </div>
  );
}
