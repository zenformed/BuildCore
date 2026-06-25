'use client';

import type { ReactElement } from 'react';
import { useEffect, useRef, useState } from 'react';
import type { BulkSelectionToolbarAction } from '@/presentation/components/BulkSelection/BulkSelectionToolbar';
import { WorkflowInlineMenu } from '@/presentation/components/CrmProjectDetail/WorkflowInlineMenu';
import projectDetailStyles from '@/presentation/components/CrmProjectDetail/ProjectDetail.module.css';
import styles from './BulkSelection.module.css';

export type BulkSelectionActionsMenuProps = {
  readonly actions: readonly BulkSelectionToolbarAction[];
  readonly disabled?: boolean;
  readonly ariaLabel: string;
};

export function BulkSelectionActionsMenu({
  actions,
  disabled = false,
  ariaLabel,
}: BulkSelectionActionsMenuProps): ReactElement {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  const closeMenu = (): void => {
    setOpen(false);
  };

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        className={styles.bulkSelectionToolbarMenuBtn}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={ariaLabel}
        disabled={disabled || actions.length === 0}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((value) => !value);
        }}
      >
        <span className={styles.bulkSelectionToolbarMenuDots} aria-hidden>
          ⋮
        </span>
      </button>
      <WorkflowInlineMenu
        open={open}
        onClose={closeMenu}
        anchorRef={anchorRef}
        align="end"
        sizeToContent
        portalClassName={`${projectDetailStyles.inlineMenu_portal} ${projectDetailStyles.actionsMenu_portal}`}
      >
        {actions.map((action) => (
          <button
            key={action.id}
            type="button"
            role="menuitem"
            className={[
              projectDetailStyles.inlineMenuAction,
              projectDetailStyles.actionsMenuItem,
              action.variant === 'danger' ? projectDetailStyles.actionsMenuItemDanger : '',
            ]
              .filter(Boolean)
              .join(' ')}
            disabled={disabled || action.disabled}
            title={action.title}
            onClick={(event) => {
              event.stopPropagation();
              closeMenu();
              action.onClick();
            }}
          >
            {action.iconClass ? (
              <span
                className={`${projectDetailStyles.actionsMenuIcon} ${action.iconClass}`}
                aria-hidden
              />
            ) : null}
            {action.label}
          </button>
        ))}
      </WorkflowInlineMenu>
    </>
  );
}
