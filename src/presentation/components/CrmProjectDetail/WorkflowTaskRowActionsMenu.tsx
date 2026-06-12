'use client';

import type { ReactElement } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { WorkflowInlineMenu } from './WorkflowInlineMenu';
import styles from './ProjectDetail.module.css';

export type WorkflowTaskRowActionsMenuProps = {
  readonly taskTitle: string;
  readonly disabled?: boolean;
  readonly canEdit?: boolean;
  readonly canDelete?: boolean;
  readonly showCustomerNotification?: boolean;
  readonly onEdit?: () => void;
  readonly onDelete?: () => void;
  readonly onSendCustomerNotification?: () => void;
};

type WorkflowTaskRowMenuItem = {
  readonly key: string;
  readonly label: string;
  readonly onSelect: () => void;
  readonly variant?: 'danger';
  readonly iconClass?: string;
};

export function WorkflowTaskRowActionsMenu({
  taskTitle,
  disabled = false,
  canEdit = false,
  canDelete = false,
  showCustomerNotification = false,
  onEdit,
  onDelete,
  onSendCustomerNotification,
}: WorkflowTaskRowActionsMenuProps): ReactElement | null {
  const wf = content.projectDetail.workflow;
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);

  const menuItems = useMemo((): readonly WorkflowTaskRowMenuItem[] => {
    const items: WorkflowTaskRowMenuItem[] = [];
    if (canEdit && onEdit) {
      items.push({
        key: 'edit',
        label: wf.editTask,
        onSelect: onEdit,
        iconClass: styles.actionsMenuEditIcon,
      });
    }
    if (showCustomerNotification && onSendCustomerNotification) {
      items.push({
        key: 'notify',
        label: wf.sendCustomerNotification,
        onSelect: onSendCustomerNotification,
        iconClass: styles.actionsMenuMailIcon,
      });
    }
    if (canDelete && onDelete) {
      items.push({
        key: 'delete',
        label: wf.deleteTask,
        onSelect: onDelete,
        variant: 'danger',
        iconClass: styles.actionsMenuDeleteIcon,
      });
    }
    return items;
  }, [
    canDelete,
    canEdit,
    onDelete,
    onEdit,
    onSendCustomerNotification,
    showCustomerNotification,
    wf.deleteTask,
    wf.editTask,
    wf.sendCustomerNotification,
  ]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  if (menuItems.length === 0) {
    return null;
  }

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
        aria-label={wf.taskActionsMenuAriaLabel(taskTitle)}
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
              <span
                className={`${styles.actionsMenuIcon} ${item.iconClass}`}
                aria-hidden
              />
            ) : null}
            {item.label}
          </button>
        ))}
      </WorkflowInlineMenu>
    </>
  );
}
