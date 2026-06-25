'use client';

import type { ReactElement } from 'react';
import { CloseIcon } from '@/platform/icons/buildCoreDashboardShellIcons';
import { BulkSelectionActionsMenu } from './BulkSelectionActionsMenu';
import styles from './BulkSelection.module.css';

export type BulkSelectionToolbarAction = {
  readonly id: string;
  readonly label: string;
  readonly onClick: () => void;
  readonly disabled?: boolean;
  readonly variant?: 'default' | 'danger';
  readonly title?: string;
  readonly iconClass?: string;
};

export type BulkSelectionToolbarVariant = 'standalone' | 'header';

export type BulkSelectionToolbarActionsLayout = 'inline' | 'menu';

export type BulkSelectionToolbarProps = {
  readonly selectedCount: number;
  readonly selectedCountLabel: string;
  readonly ariaLabel: string;
  readonly actions: readonly BulkSelectionToolbarAction[];
  readonly onCancel: () => void;
  readonly cancelLabel: string;
  readonly variant?: BulkSelectionToolbarVariant;
  readonly className?: string;
  readonly actionsLayout?: BulkSelectionToolbarActionsLayout;
  readonly actionsMenuAriaLabel?: string;
};

export function BulkSelectionToolbar({
  selectedCount,
  selectedCountLabel,
  ariaLabel,
  actions,
  onCancel,
  cancelLabel,
  variant = 'standalone',
  className,
  actionsLayout = 'inline',
  actionsMenuAriaLabel = ariaLabel,
}: BulkSelectionToolbarProps): ReactElement {
  return (
    <div
      className={[
        styles.bulkSelectionToolbar,
        variant === 'header' ? styles.bulkSelectionToolbar_header : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      role="toolbar"
      aria-label={ariaLabel}
    >
      <span className={styles.bulkSelectionToolbarCount}>{selectedCountLabel}</span>
      <div
        className={[
          styles.bulkSelectionToolbarActions,
          actionsLayout === 'menu' ? styles.bulkSelectionToolbarActions_menu : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {actionsLayout === 'menu' ? (
          <BulkSelectionActionsMenu
            actions={actions}
            ariaLabel={actionsMenuAriaLabel}
          />
        ) : (
          actions.map((action) => (
            <button
              key={action.id}
              type="button"
              className={[
                styles.bulkSelectionToolbarBtn,
                action.variant === 'danger' ? styles.bulkSelectionToolbarBtn_danger : '',
              ]
                .filter(Boolean)
                .join(' ')}
              disabled={action.disabled}
              title={action.title}
              onClick={action.onClick}
            >
              {action.label}
            </button>
          ))
        )}
        <button
          type="button"
          className={styles.bulkSelectionToolbarCancelBtn}
          aria-label={cancelLabel}
          title={cancelLabel}
          onClick={onCancel}
        >
          <CloseIcon className={styles.bulkSelectionToolbarCancelBtnIcon} />
        </button>
      </div>
    </div>
  );
}
