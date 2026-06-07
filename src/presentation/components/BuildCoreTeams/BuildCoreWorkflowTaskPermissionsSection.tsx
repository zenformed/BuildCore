'use client';

import type { ReactElement } from 'react';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { BuildCoreRolePermissionsSection } from './BuildCoreRolePermissionsSection';
import { BuildCoreWorkflowTaskMemberVisibilitySetting } from './BuildCoreWorkflowTaskMemberVisibilitySetting';
import styles from './BuildCoreTeams.module.css';

export type BuildCoreWorkflowTaskPermissionsSectionProps = {
  readonly enabled: boolean;
};

export function BuildCoreWorkflowTaskPermissionsSection({
  enabled,
}: BuildCoreWorkflowTaskPermissionsSectionProps): ReactElement {
  const copy = content.teams.workflowTaskPermissions;
  return (
    <BuildCoreRolePermissionsSection
      domain="workflow_tasks"
      enabled={enabled}
      headingId="teams-workflow-task-permissions-heading"
      copy={copy}
      footer={<BuildCoreWorkflowTaskMemberVisibilitySetting enabled={enabled} />}
    />
  );
}
