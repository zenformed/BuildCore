'use client';

import type { ReactElement, ReactNode } from 'react';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { useBuildCoreWorkflowSettingsAccess } from '@/presentation/features/buildCoreWorkflowSettings/useBuildCoreWorkflowSettingsAccess';
import styles from '../BuildCoreWorkflowStages/BuildCoreWorkflowStages.module.css';

export function BuildCoreWorkflowSettingsNoAccess(): ReactElement {
  const copy = content.workflowSettings;
  return <p className={styles.error}>{copy.noAccess}</p>;
}

export function BuildCoreWorkflowSettingsAccessGate({
  children,
}: {
  readonly children: ReactNode;
}): ReactElement {
  const { isLoadingPermissions, canManageWorkflowSettings } = useBuildCoreWorkflowSettingsAccess();
  const copy = content.workflowSettings;

  if (isLoadingPermissions) {
    return <p className={styles.loading}>{copy.loading}</p>;
  }

  if (!canManageWorkflowSettings) {
    return <BuildCoreWorkflowSettingsNoAccess />;
  }

  return <>{children}</>;
}
