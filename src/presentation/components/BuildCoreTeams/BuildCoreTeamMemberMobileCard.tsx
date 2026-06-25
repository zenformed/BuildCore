'use client';

import type { ReactElement } from 'react';
import { buildcoreAppDefinition } from '@/platform/appDefinitions/buildcore';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { runtimeModes } from '@/infrastructure/config/runtimeModes';
import type { BuildCoreTeamMemberRow } from '@/presentation/features/buildCoreTeams/buildCoreTeamsViewModel';
import projectStyles from '../CrmProjectDetail/ProjectDetail.module.css';
import styles from './BuildCoreTeams.module.css';

export type BuildCoreTeamMemberMobileCardProps = {
  readonly row: BuildCoreTeamMemberRow;
};

export function BuildCoreTeamMemberMobileCard({
  row,
}: BuildCoreTeamMemberMobileCardProps): ReactElement {
  const copy = content.teams.table;
  const demoCopy = content.teams.demo;
  const accessCopy = content.teams.accessStatus;
  const isDemoRuntime = runtimeModes.isDemoRuntime();
  const buildCoreEnabled = row.buildCoreAccessStatus === 'enabled';

  return (
    <article className={`${projectStyles.card} ${styles.memberMobileCard}`} aria-label={row.name}>
      <div className={styles.memberMobileCardBody}>
        <div className={projectStyles.workflowTaskMobileCardGrid2}>
          <div className={projectStyles.workflowTaskMobileCardCell}>
            <span className={projectStyles.projectInfoMobileLabel}>{copy.name}</span>
            <span className={styles.memberMobileName}>{row.name}</span>
          </div>
          <div
            className={`${projectStyles.workflowTaskMobileCardCell} ${projectStyles.workflowTaskMobileCardCell_right}`}
          >
            <span className={projectStyles.projectInfoMobileLabel}>{copy.role}</span>
            <span className={styles.organizationRoleBadge}>{row.organizationRoleLabel}</span>
          </div>
        </div>
        <div className={projectStyles.workflowTaskMobileCardGrid2}>
          <div className={projectStyles.workflowTaskMobileCardCell}>
            <span className={projectStyles.projectInfoMobileLabel}>{copy.email}</span>
            <p className={styles.memberMobileEmail}>{row.email ?? '—'}</p>
          </div>
          <div
            className={`${projectStyles.workflowTaskMobileCardCell} ${projectStyles.workflowTaskMobileCardCell_right}`}
          >
            <span className={projectStyles.projectInfoMobileLabel}>
              {buildcoreAppDefinition.displayName}
            </span>
            <div className={styles.memberMobileBuildCoreToggleWrap}>
              <button
                type="button"
                role="switch"
                className={`${styles.permissionSwitch} ${
                  buildCoreEnabled ? styles.permissionSwitchOn : ''
                }`}
                disabled={isDemoRuntime}
                title={isDemoRuntime ? demoCopy.accessToggleDisabledTitle : undefined}
                aria-checked={buildCoreEnabled}
                aria-label={`${copy.buildCoreAccessToggleAriaLabel}: ${buildCoreEnabled ? accessCopy.enabled : accessCopy.notConfigured}`}
              >
                <span className={styles.permissionSwitchThumb} aria-hidden />
              </button>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
