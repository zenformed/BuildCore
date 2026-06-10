'use client';

import type { ReactElement, ReactNode } from 'react';
import { useBuildCoreDashboardContext } from '@/presentation/providers/BuildCoreDashboardProvider';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
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
  const dash = useBuildCoreDashboardContext();
  if (!dash.canAccessBuildCoreWorkflowStages) {
    return <BuildCoreWorkflowStagesNoAccess />;
  }
  return <>{children}</>;
}
