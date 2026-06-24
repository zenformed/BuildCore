'use client';

import type { ReactElement } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { WorkflowInlineMenu } from './WorkflowInlineMenu';
import styles from './ProjectDetail.module.css';

export type BudgetRowActionsMenuProps = {
  readonly itemName: string;
  readonly disabled?: boolean;
  readonly showSendAttachment?: boolean;
  readonly onSendAttachment?: () => void;
  readonly onDelete?: () => void;
};

type BudgetRowMenuItem = {
  readonly key: string;
  readonly label: string;
  readonly onSelect: () => void;
  readonly variant?: 'danger';
  readonly iconClass?: string;
};

export function BudgetRowActionsMenu({
  itemName,
  disabled = false,
  showSendAttachment = false,
  onSendAttachment,
  onDelete,
}: BudgetRowActionsMenuProps): ReactElement | null {
  const b = content.projectDetail.budget;
  const wf = content.projectDetail.workflow;
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);

  const menuItems = useMemo((): readonly BudgetRowMenuItem[] => {
    const items: BudgetRowMenuItem[] = [];
    if (showSendAttachment && onSendAttachment) {
      items.push({
        key: 'send-attachment',
        label: wf.sendAttachment,
        onSelect: onSendAttachment,
        iconClass: styles.actionsMenuAttachmentIcon,
      });
    }
    if (onDelete) {
      items.push({
        key: 'delete',
        label: b.deleteItem,
        onSelect: onDelete,
        variant: 'danger',
        iconClass: styles.actionsMenuDeleteIcon,
      });
    }
    return items;
  }, [b.deleteItem, onDelete, onSendAttachment, showSendAttachment, wf.sendAttachment]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  if (menuItems.length === 0) return null;

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
        {menuItems.map((item) => (
          <button
            key={item.key}
            type="button"
            role="menuitem"
            className={[
              styles.inlineMenuAction,
              styles.actionsMenuItem,
              item.variant === 'danger' ? styles.actionsMenuItemDanger : '',
            ]
              .filter(Boolean)
              .join(' ')}
            disabled={disabled}
            onClick={(event) => {
              event.stopPropagation();
              closeMenu();
              item.onSelect();
            }}
          >
            {item.iconClass ? (
              <span className={`${styles.actionsMenuIcon} ${item.iconClass}`} aria-hidden />
            ) : null}
            {item.label}
          </button>
        ))}
      </WorkflowInlineMenu>
    </>
  );
}
