'use client';

import type { ReactElement } from 'react';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { useBuildCoreWorkflowTaskPermissions } from '@/presentation/features/buildCoreTeams/useBuildCoreWorkflowTaskPermissions';
import { BUILDCORE_WORKFLOW_TASK_PERMISSION_COLUMNS } from '@/domain/buildcore/rolePermissions';
import projectStyles from '../CrmProjectDetail/ProjectDetail.module.css';
import { BuildCorePermissionMatrix } from './BuildCorePermissionMatrix';
import styles from './BuildCoreTeams.module.css';

export type BuildCoreWorkflowTaskPermissionsSectionProps = {
  readonly enabled: boolean;
};

export function BuildCoreWorkflowTaskPermissionsSection({
  enabled,
}: BuildCoreWorkflowTaskPermissionsSectionProps): ReactElement {
  const copy = content.teams.workflowTaskPermissions;
  const permissions = useBuildCoreWorkflowTaskPermissions(enabled);

  return (
    <section
      className={`${projectStyles.card} ${styles.permissionsSection}`}
      aria-labelledby="teams-workflow-task-permissions-heading"
    >
      <h2 id="teams-workflow-task-permissions-heading" className={projectStyles.cardTitle}>
        {copy.title}
      </h2>
      <p className={projectStyles.cardHelper}>{copy.hint}</p>

      {permissions.isLoading ? (
        <p className={styles.loading}>{copy.loading}</p>
      ) : permissions.loadError ? (
        <p className={styles.error}>{permissions.loadError}</p>
      ) : permissions.data == null ? (
        <p className={styles.empty}>{copy.empty}</p>
      ) : (
        <>
          <BuildCorePermissionMatrix
            columns={BUILDCORE_WORKFLOW_TASK_PERMISSION_COLUMNS}
            rows={permissions.data.rows}
            canEditRow={permissions.canEditRow}
            onToggle={(roleKey, columnId, nextValue) => {
              void permissions.togglePermission(roleKey, columnId, nextValue);
            }}
            busyCell={permissions.busyCell}
            roleColumnLabel={copy.roleColumn}
          />
          {permissions.statusMessage ? (
            <p
              className={`${styles.permissionStatusLine} ${
                permissions.statusKind === 'success'
                  ? styles.permissionStatusSuccess
                  : styles.permissionStatusError
              }`}
              role="status"
            >
              {permissions.statusMessage}
            </p>
          ) : null}
        </>
      )}
    </section>
  );
}
