'use client';

import type { ReactElement } from 'react';
import { useState } from 'react';
import type { WorkflowSettingsDesktopNavId } from '@/presentation/features/buildCoreWorkflowSettings/workflowSettingsNavModel';
import { useDashboardMobileLayout } from '@/presentation/features/crmProjects/useDashboardMobileLayout';
import { WorkflowSettingsSidebarNav } from './WorkflowSettingsSidebarNav';
import {
  WorkflowSettingsAlertsPanel,
  WorkflowSettingsMobileSections,
  WorkflowSettingsStagesPanel,
} from './WorkflowSettingsPanels';
import styles from './BuildCoreWorkflowSettings.module.css';

function renderDesktopPanel(selectedNav: WorkflowSettingsDesktopNavId): ReactElement {
  switch (selectedNav) {
    case 'workflowStages':
      return <WorkflowSettingsStagesPanel />;
    case 'alerts':
      return <WorkflowSettingsAlertsPanel />;
    default: {
      const _exhaustive: never = selectedNav;
      return _exhaustive;
    }
  }
}

export function BuildCoreWorkflowSettingsSections(): ReactElement {
  const isMobileLayout = useDashboardMobileLayout();
  const [selectedNav, setSelectedNav] = useState<WorkflowSettingsDesktopNavId>('workflowStages');

  if (isMobileLayout) {
    return <WorkflowSettingsMobileSections />;
  }

  return (
    <div className={styles.workflowSettingsPageLayout} data-workflow-settings-nav={selectedNav}>
      <WorkflowSettingsSidebarNav selectedNav={selectedNav} onSelectNav={setSelectedNav} />
      <div
        className={styles.workflowSettingsPageContent}
        role="region"
        aria-label={selectedNav === 'workflowStages' ? 'Workflow Stages' : 'Alerts'}
      >
        {renderDesktopPanel(selectedNav)}
      </div>
    </div>
  );
}
