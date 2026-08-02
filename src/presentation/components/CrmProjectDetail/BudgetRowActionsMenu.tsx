'use client';

import type { ReactElement, ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { LuPaperclip, LuTrash2 } from 'react-icons/lu';
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

type ActionIconTone = 'attachment' | 'delete';

type BudgetRowMenuItem = {
  readonly key: string;
  readonly label: string;
  readonly onSelect: () => void;
  readonly variant?: 'danger';
  readonly tone: ActionIconTone;
  readonly icon: ReactNode;
};

const ACTION_ICON_TONE_CLASS: Record<ActionIconTone, string> = {
  attachment: styles.actionsMenuIconTile_attachment,
  delete: styles.actionsMenuIconTile_delete,
};

function ActionIconTile({
  tone,
  children,
}: {
  readonly tone: ActionIconTone;
  readonly children: ReactNode;
}): ReactElement {
  return (
    <span
      className={[styles.actionsMenuIconTile, ACTION_ICON_TONE_CLASS[tone]].join(' ')}
      aria-hidden
    >
      {children}
    </span>
  );
}

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
  const iconProps = { size: 15, strokeWidth: 2.25 } as const;

  const menuItems = useMemo((): readonly BudgetRowMenuItem[] => {
    const items: BudgetRowMenuItem[] = [];
    if (showSendAttachment && onSendAttachment) {
      items.push({
        key: 'send-attachment',
        label: wf.sendAttachment,
        onSelect: onSendAttachment,
        tone: 'attachment',
        icon: <LuPaperclip {...iconProps} />,
      });
    }
    if (onDelete) {
      items.push({
        key: 'delete',
        label: b.deleteItem,
        onSelect: onDelete,
        variant: 'danger',
        tone: 'delete',
        icon: <LuTrash2 {...iconProps} />,
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
            <ActionIconTile tone={item.tone}>{item.icon}</ActionIconTile>
            {item.label}
          </button>
        ))}
      </WorkflowInlineMenu>
    </>
  );
}
