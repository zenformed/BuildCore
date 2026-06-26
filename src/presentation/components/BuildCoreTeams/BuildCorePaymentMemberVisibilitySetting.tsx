'use client';

import type { ReactElement } from 'react';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { runtimeModes } from '@/infrastructure/config/runtimeModes';
import { useDashboardMobileLayout } from '@/presentation/features/crmProjects/useDashboardMobileLayout';
import { useBuildCorePaymentMemberVisibility } from '@/presentation/features/buildCoreTeams/useBuildCorePaymentMemberVisibility';
import projectStyles from '../CrmProjectDetail/ProjectDetail.module.css';
import styles from './BuildCoreTeams.module.css';

export type BuildCorePaymentMemberVisibilitySettingProps = {
  readonly enabled: boolean;
};

export function BuildCorePaymentMemberVisibilitySetting({
  enabled,
}: BuildCorePaymentMemberVisibilitySettingProps): ReactElement {
  const copy = content.teams.paymentPermissions.memberVisibility;
  const demoCopy = content.teams.demo;
  const visibility = useBuildCorePaymentMemberVisibility(enabled);
  const isMobileLayout = useDashboardMobileLayout();
  const isDemoRuntime = runtimeModes.isDemoRuntime();

  if (visibility.isLoading) {
    return <p className={styles.loading}>{copy.loading}</p>;
  }

  if (visibility.loadError) {
    return <p className={styles.error}>{visibility.loadError}</p>;
  }

  const toggle = (
    <button
      type="button"
      role="switch"
      className={`${styles.permissionSwitch} ${
        visibility.onlyAssignedUserCanView ? styles.permissionSwitchOn : ''
      }`}
      disabled={!visibility.canEdit || visibility.isSaving}
      title={isDemoRuntime ? demoCopy.permissionsReadOnlyNote : undefined}
      aria-checked={visibility.onlyAssignedUserCanView}
      aria-label={`${copy.toggleLabel}: ${visibility.onlyAssignedUserCanView ? 'on' : 'off'}`}
      onClick={() =>
        void visibility.toggleOnlyAssignedUserCanView(!visibility.onlyAssignedUserCanView)
      }
    >
      <span className={styles.permissionSwitchThumb} aria-hidden />
    </button>
  );

  const statusMessage = visibility.statusMessage ? (
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
  ) : null;

  if (isMobileLayout) {
    return (
      <article
        className={`${projectStyles.card} ${styles.memberVisibilityMobileCard}`}
        aria-label={copy.toggleLabel}
      >
        <div className={styles.memberVisibilityMobileCardBody}>
          <h3 className={styles.memberVisibilityMobileTitle}>{copy.toggleLabel}</h3>
          <p className={styles.memberVisibilityMobileHint}>{copy.hint}</p>
          <div className={styles.memberVisibilityMobileToggleRow}>{toggle}</div>
          <p className={styles.memberVisibilityMobileDefault}>{copy.defaultNote}</p>
          {statusMessage}
        </div>
      </article>
    );
  }

  return (
    <div className={styles.memberVisibilitySetting}>
      <div className={styles.memberVisibilitySettingRow}>
        <div className={styles.memberVisibilitySettingCopy}>
          <p className={projectStyles.cardHelper}>{copy.hint}</p>
        </div>
        {toggle}
      </div>
      <p className={styles.memberVisibilitySettingLabel}>
        {copy.toggleLabel}
        <span className={projectStyles.cardHelper}> · {copy.defaultNote}</span>
      </p>
      {statusMessage}
    </div>
  );
}
