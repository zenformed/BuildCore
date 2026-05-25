'use client';

import type { ReactElement } from 'react';
import type {
  BuildCorePermissionColumnId,
  BuildCorePermissionRoleKey,
  BuildCoreRolePermissionRow,
} from '@/domain/buildcore/rolePermissions';
import { roleLabelForBuildCorePermissionKey } from '@/domain/buildcore/rolePermissions';
import styles from './BuildCoreTeams.module.css';

export type BuildCorePermissionMatrixProps = {
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
  readonly roleColumnLabel?: string;
};

export function BuildCorePermissionMatrix({
  columns,
  rows,
  canEditRow,
  onToggle,
  busyCell = null,
  roleColumnLabel = 'Role',
}: BuildCorePermissionMatrixProps): ReactElement {
  return (
    <div className={styles.matrixWrap}>
      <table className={styles.permissionsMatrix}>
        <thead>
          <tr>
            <th scope="col" className={styles.matrixRoleCol}>
              {roleColumnLabel}
            </th>
            {columns.map((col) => (
              <th key={col.id} scope="col">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const rowEditable = canEditRow(row.roleKey);
            return (
              <tr key={row.roleKey} className={rowEditable ? undefined : styles.matrixRowLocked}>
                <td className={styles.matrixRoleCell}>
                  {roleLabelForBuildCorePermissionKey(row.roleKey)}
                </td>
                {columns.map((col) => {
                  const value = row[col.id];
                  const isBusy =
                    busyCell?.roleKey === row.roleKey && busyCell.columnId === col.id;
                  const stateLabel = value ? 'on' : 'off';
                  return (
                    <td key={col.id} className={styles.permissionSwitchCell}>
                      <button
                        type="button"
                        role="switch"
                        className={`${styles.permissionSwitch} ${
                          value ? styles.permissionSwitchOn : ''
                        }`}
                        disabled={!rowEditable || isBusy}
                        aria-checked={value}
                        aria-label={`${roleLabelForBuildCorePermissionKey(row.roleKey)} ${col.label}: ${stateLabel}`}
                        onClick={() => onToggle(row.roleKey, col.id, !value)}
                      >
                        <span className={styles.permissionSwitchThumb} aria-hidden />
                      </button>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
