'use client';

import type { ReactElement } from 'react';
import { useEffect, useRef, useState } from 'react';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { WorkflowInlineMenu } from './WorkflowInlineMenu';
import styles from './ProjectDetail.module.css';

export type BudgetRowActionsMenuProps = {
  readonly itemName: string;
  readonly disabled?: boolean;
  readonly onDelete: () => void;
};

export function BudgetRowActionsMenu({
  itemName,
  disabled = false,
  onDelete,
}: BudgetRowActionsMenuProps): ReactElement {
  const b = content.projectDetail.budget;
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
        className={styles.taskActionsBtn}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Actions for ${itemName}`}
        title={content.projectDetail.actionsButton}
        disabled={disabled}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((value) => !value);
        }}
      >
        <span className={styles.taskActionsDots} aria-hidden>
          ⋮
        </span>
      </button>
      <WorkflowInlineMenu
        open={open}
        onClose={closeMenu}
        anchorRef={anchorRef}
        align="end"
        sizeToContent
        portalClassName={`${styles.inlineMenu_portal} ${styles.actionsMenu_portal}`}
      >
        <button
          type="button"
          role="menuitem"
          className={`${styles.inlineMenuAction} ${styles.actionsMenuItem} ${styles.actionsMenuItemDanger}`}
          disabled={disabled}
          onClick={(event) => {
            event.stopPropagation();
            closeMenu();
            onDelete();
          }}
        >
          <span
            className={`${styles.actionsMenuIcon} ${styles.actionsMenuDeleteIcon}`}
            aria-hidden
          />
          {b.deleteItem}
        </button>
      </WorkflowInlineMenu>
    </>
  );
}
