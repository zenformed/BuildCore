'use client';

import type { ReactElement } from 'react';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { useBuildCoreWorkflowTaskMemberVisibility } from '@/presentation/features/buildCoreTeams/useBuildCoreWorkflowTaskMemberVisibility';
import projectStyles from '../CrmProjectDetail/ProjectDetail.module.css';
import styles from './BuildCoreTeams.module.css';

export type BuildCoreWorkflowTaskMemberVisibilitySettingProps = {
  readonly enabled: boolean;
};

export function BuildCoreWorkflowTaskMemberVisibilitySetting({
  enabled,
}: BuildCoreWorkflowTaskMemberVisibilitySettingProps): ReactElement {
  const copy = content.teams.workflowTaskPermissions.memberVisibility;
  const visibility = useBuildCoreWorkflowTaskMemberVisibility(enabled);

  if (visibility.isLoading) {
    return <p className={styles.loading}>{copy.loading}</p>;
  }

  if (visibility.loadError) {
    return <p className={styles.error}>{visibility.loadError}</p>;
  }

  return (
    <div className={styles.memberVisibilitySetting}>
      <div className={styles.memberVisibilitySettingRow}>
        <div className={styles.memberVisibilitySettingCopy}>
          <p className={projectStyles.cardHelper}>{copy.hint}</p>
        </div>
        <button
          type="button"
          role="switch"
          className={`${styles.permissionSwitch} ${
            visibility.onlyAssignedUserCanView ? styles.permissionSwitchOn : ''
          }`}
          disabled={!visibility.canEdit || visibility.isSaving}
          aria-checked={visibility.onlyAssignedUserCanView}
          aria-label={`${copy.toggleLabel}: ${visibility.onlyAssignedUserCanView ? 'on' : 'off'}`}
          onClick={() =>
            void visibility.toggleOnlyAssignedUserCanView(!visibility.onlyAssignedUserCanView)
          }
        >
          <span className={styles.permissionSwitchThumb} aria-hidden />
        </button>
      </div>
      <p className={styles.memberVisibilitySettingLabel}>{copy.toggleLabel}</p>
      {visibility.statusMessage ? (
        <p
          className={`${styles.permissionStatusLine} ${
            visibility.statusKind === 'success'
              ? styles.permissionStatusSuccess
              : styles.permissionStatusError
          }`}
          role="status"
        >
          {visibility.statusMessage}
        </p>
      ) : null}
    </div>
  );
}
