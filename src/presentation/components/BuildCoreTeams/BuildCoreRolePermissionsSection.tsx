'use client';

import { useId, useState, type ReactElement, type ReactNode } from 'react';
import type { BuildCorePermissionDomain } from '@/domain/buildcore/rolePermissions';
import { BUILDCORE_PERMISSION_COLUMNS } from '@/domain/buildcore/rolePermissions';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { useBuildCoreRolePermissions } from '@/presentation/features/buildCoreTeams/useBuildCoreRolePermissions';
import { useDashboardMobileLayout } from '@/presentation/features/crmProjects/useDashboardMobileLayout';
import projectStyles from '../CrmProjectDetail/ProjectDetail.module.css';
import { BuildCorePermissionMatrix } from './BuildCorePermissionMatrix';
import styles from './BuildCoreTeams.module.css';

export type BuildCoreRolePermissionsSectionCopy = {
  readonly title: string;
  readonly hint: string;
  readonly roleColumn: string;
  readonly loading: string;
  readonly empty: string;
};

export type BuildCoreRolePermissionsSectionProps = {
  readonly domain: BuildCorePermissionDomain;
  readonly enabled: boolean;
  readonly headingId: string;
  readonly copy: BuildCoreRolePermissionsSectionCopy;
  readonly defaultExpanded?: boolean;
  readonly layout?: 'accordion' | 'tabPanel';
  readonly footer?: ReactNode;
};

function PermissionsSectionBody({
  copy,
  permissions,
  footer,
}: {
  copy: BuildCoreRolePermissionsSectionCopy;
  permissions: ReturnType<typeof useBuildCoreRolePermissions>;
  footer?: ReactNode;
}): ReactElement {
  const isMobileLayout = useDashboardMobileLayout();

  return (
    <>
      {!isMobileLayout ? <p className={projectStyles.cardHelper}>{copy.hint}</p> : null}

      {permissions.isLoading ? (
        <p className={styles.loading}>{copy.loading}</p>
      ) : permissions.loadError ? (
        <p className={styles.error}>{permissions.loadError}</p>
      ) : permissions.data == null ? (
        <p className={styles.empty}>{copy.empty}</p>
      ) : (
        <>
          {isMobileLayout ? <p className={styles.permissionMobileHint}>{copy.hint}</p> : null}
          <BuildCorePermissionMatrix
            columns={BUILDCORE_PERMISSION_COLUMNS}
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
          {footer ? (
            <div className={isMobileLayout ? styles.permissionMobileFooter : undefined}>{footer}</div>
          ) : null}
        </>
      )}
    </>
  );
}

export function BuildCoreRolePermissionsSection({
  domain,
  enabled,
  headingId,
  copy,
  defaultExpanded = true,
  layout = 'accordion',
  footer,
}: BuildCoreRolePermissionsSectionProps): ReactElement {
  const teamsCopy = content.teams;
  const [expanded, setExpanded] = useState(defaultExpanded);
  const panelId = useId();
  const permissions = useBuildCoreRolePermissions(domain, enabled);

  if (layout === 'tabPanel') {
    return (
      <section
        className={`${projectStyles.card} ${styles.permissionsTabPanel}`}
        aria-labelledby={headingId}
      >
        <h2 id={headingId} className={styles.permissionsTabPanelSrOnly}>
          {copy.title}
        </h2>
        <div className={styles.permissionsTabPanelBody}>
          <PermissionsSectionBody copy={copy} permissions={permissions} footer={footer} />
        </div>
      </section>
    );
  }

  const sectionClass = [
    projectStyles.card,
    styles.permissionsSection,
    expanded ? '' : styles.permissionsSection_collapsed,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <section className={sectionClass} aria-labelledby={headingId}>
      <button
        type="button"
        className={styles.permissionsSectionHeaderBtn}
        aria-expanded={expanded}
        aria-controls={panelId}
        aria-label={`${expanded ? teamsCopy.permissionsCollapse : teamsCopy.permissionsExpand}: ${copy.title}`}
        onClick={() => setExpanded((open) => !open)}
      >
        <span className={styles.permissionsSectionHeaderTitle}>
          <h2
            id={headingId}
            className={`${projectStyles.cardTitle} ${styles.permissionsSectionHeading}`}
          >
            {copy.title}
          </h2>
          <span className={styles.permissionsSectionChevronWrap} aria-hidden>
            <span
              className={
                expanded ? styles.permissionsSectionChevron_expanded : styles.permissionsSectionChevron
              }
            />
          </span>
        </span>
      </button>

      {expanded ? (
        <div id={panelId} className={styles.permissionsSectionBody}>
          <PermissionsSectionBody copy={copy} permissions={permissions} footer={footer} />
        </div>
      ) : null}
    </section>
  );
}
