'use client';

import type { ReactElement } from 'react';
import type {
  BuildCorePermissionColumnId,
  BuildCorePermissionRoleKey,
  BuildCoreRolePermissionRow,
} from '@/domain/buildcore/rolePermissions';
import { roleLabelForBuildCorePermissionKey } from '@/domain/buildcore/rolePermissions';
import projectStyles from '../CrmProjectDetail/ProjectDetail.module.css';
import styles from './BuildCoreTeams.module.css';

export type BuildCorePermissionMatrixMobileProps = {
  readonly columns: readonly { readonly id: BuildCorePermissionColumnId; readonly label: string }[];
  readonly rows: readonly BuildCoreRolePermissionRow[];
  readonly canEditRow: (roleKey: BuildCorePermissionRoleKey) => boolean;
  readonly onToggle: (
    roleKey: BuildCorePermissionRoleKey,
    columnId: BuildCorePermissionColumnId,
    nextValue: boolean
  ) => void;
  readonly busyCell?: {
    readonly roleKey: BuildCorePermissionRoleKey;
    readonly columnId: BuildCorePermissionColumnId;
  } | null;
};

export function BuildCorePermissionMatrixMobile({
  columns,
  rows,
  canEditRow,
  onToggle,
  busyCell = null,
}: BuildCorePermissionMatrixMobileProps): ReactElement {
  const leftColumns = columns.filter((_, index) => index % 2 === 0);
  const rightColumns = columns.filter((_, index) => index % 2 === 1);

  const renderPermissionCell = (
    row: BuildCoreRolePermissionRow,
    roleLabel: string,
    rowEditable: boolean,
    col: (typeof columns)[number]
  ): ReactElement => {
    const value = row[col.id];
    const isBusy = busyCell?.roleKey === row.roleKey && busyCell.columnId === col.id;
    const stateLabel = value ? 'on' : 'off';

    return (
      <div key={col.id} className={styles.permissionMobileGridCell}>
        <button
          type="button"
          role="switch"
          className={`${styles.permissionSwitch} ${value ? styles.permissionSwitchOn : ''}`}
          disabled={!rowEditable || isBusy}
          aria-checked={value}
          aria-label={`${roleLabel} ${col.label}: ${stateLabel}`}
          onClick={() => onToggle(row.roleKey, col.id, !value)}
        >
          <span className={styles.permissionSwitchThumb} aria-hidden />
        </button>
        <span className={styles.permissionMobileGridLabel}>{col.label}</span>
      </div>
    );
  };

  return (
    <div className={styles.permissionMobileList}>
      {rows.map((row) => {
        const rowEditable = canEditRow(row.roleKey);
        const roleLabel = roleLabelForBuildCorePermissionKey(row.roleKey);

        return (
          <article
            key={row.roleKey}
            className={`${projectStyles.card} ${projectStyles.workflowTaskMobileCard} ${styles.permissionMobileRoleCard}`}
            aria-label={`${roleLabel} permissions`}
          >
            <div className={projectStyles.workflowTaskMobileCardHeader}>
              <div className={projectStyles.workflowTaskMobileCardTitleWrap}>
                <span className={projectStyles.workflowTaskMobileCardTitle}>{roleLabel}</span>
              </div>
            </div>
            <div className={styles.permissionMobileRoleCardBody}>
              <div className={styles.permissionMobileGrid}>
                <div className={styles.permissionMobileGridCol}>
                  {leftColumns.map((col) =>
                    renderPermissionCell(row, roleLabel, rowEditable, col)
                  )}
                </div>
                <div className={styles.permissionMobileGridCol}>
                  {rightColumns.map((col) =>
                    renderPermissionCell(row, roleLabel, rowEditable, col)
                  )}
                </div>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
