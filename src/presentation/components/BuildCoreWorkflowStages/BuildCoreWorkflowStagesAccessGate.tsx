'use client';

import type { ReactElement, ReactNode } from 'react';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { useBuildCoreWorkflowSettingsAccess } from '@/presentation/features/buildCoreWorkflowSettings/useBuildCoreWorkflowSettingsAccess';
import styles from './BuildCoreWorkflowStages.module.css';

export function BuildCoreWorkflowStagesNoAccess(): ReactElement {
  const copy = content.workflowStages;
  return <p className={styles.error}>{copy.noAccess}</p>;
}

export function BuildCoreWorkflowStagesAccessGate({
  children,
}: {
  readonly children: ReactNode;
}): ReactElement {
  const { isLoadingPermissions, canManageWorkflowSettings } = useBuildCoreWorkflowSettingsAccess();
  const copy = content.workflowStages;

  if (isLoadingPermissions) {
    return <p className={styles.loading}>{copy.loading}</p>;
  }

  if (!canManageWorkflowSettings) {
    return <BuildCoreWorkflowStagesNoAccess />;
  }

  return <>{children}</>;
}
