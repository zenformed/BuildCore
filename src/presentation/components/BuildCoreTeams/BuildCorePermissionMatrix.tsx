'use client';

import { useId, useState, type ReactElement, type ReactNode } from 'react';
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
  readonly memberVisibility?: ReactNode;
};

const PERMISSION_DESCRIPTIONS: Readonly<Record<BuildCorePermissionColumnId, string>> = {
  canView: 'Open and view records in this area.',
  canCreate: 'Create new records.',
  canEdit: 'Change existing records.',
  canApprove: 'Approve records or completed work when approval is required.',
  canDelete: 'Delete records.',
  canUpload: 'Upload files and attachments.',
  canDownload: 'Download files and attachments.',
  canSendFiles: 'Send files to customers or other recipients.',
  canViewAllStages: 'View records across every workflow stage.',
};

const ROLE_DESCRIPTIONS: Readonly<Record<BuildCorePermissionRoleKey, string>> = {
  admin: 'Manage Admin permissions.',
  coordinator: 'Manage Coordinator permissions.',
  member: 'Manage Member permissions.',
};

export function BuildCorePermissionMatrix({
  columns,
  rows,
  canEditRow,
  onToggle,
  busyCell = null,
  memberVisibility,
}: BuildCorePermissionMatrixProps): ReactElement {
  const [expandedRoleKey, setExpandedRoleKey] = useState<BuildCorePermissionRoleKey | null>(null);
  const accordionId = useId();

  return (
    <div className={styles.permissionRoleAccordion}>
      {rows.map((row) => {
        const expanded = expandedRoleKey === row.roleKey;
        const editable = canEditRow(row.roleKey);
        const panelId = `${accordionId}-${row.roleKey}`;

        return (
          <section
            key={row.roleKey}
            className={`${styles.permissionRoleAccordionItem}${
              expanded ? ` ${styles.permissionRoleAccordionItemOpen}` : ''
            }`}
          >
            <div className={styles.permissionRoleAccordionHeader}>
              <button
                type="button"
                className={styles.permissionRoleAccordionButton}
                aria-expanded={expanded}
                aria-controls={panelId}
                aria-label={`${expanded ? 'Collapse' : 'Expand'} ${roleLabelForBuildCorePermissionKey(row.roleKey)} permissions`}
                onClick={() => {
                  setExpandedRoleKey((current) => (current === row.roleKey ? null : row.roleKey));
                }}
              >
                <span className={styles.permissionRoleAccordionChevron} aria-hidden="true" />
              </button>
              <div className={styles.permissionRoleAccordionCopy}>
                <strong>{roleLabelForBuildCorePermissionKey(row.roleKey)}</strong>
                <p>{ROLE_DESCRIPTIONS[row.roleKey]}</p>
              </div>
            </div>

            {expanded ? (
              <div id={panelId} className={styles.permissionList}>
                {columns.map((column) => {
                  const checked = row[column.id];
                  const busy =
                    busyCell?.roleKey === row.roleKey && busyCell.columnId === column.id;

                  return (
                    <div key={column.id} className={styles.permissionListRow}>
                      <div className={styles.permissionListCopy}>
                        <strong>{column.label}</strong>
                        <span>{PERMISSION_DESCRIPTIONS[column.id]}</span>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={checked}
                        aria-label={`${roleLabelForBuildCorePermissionKey(row.roleKey)}: ${column.label}`}
                        className={`${styles.permissionSwitch}${
                          checked ? ` ${styles.permissionSwitchOn}` : ''
                        }`}
                        disabled={!editable || busy}
                        onClick={() => onToggle(row.roleKey, column.id, !checked)}
                      >
                        <span className={styles.permissionSwitchThumb} />
                      </button>
                    </div>
                  );
                })}
                {row.roleKey === 'member' && memberVisibility ? (
                  <div className={styles.memberVisibilityInPermissionCard}>{memberVisibility}</div>
                ) : null}
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
