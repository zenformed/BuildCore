'use client';

import type { MutableRefObject, ReactElement, ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { LuFileText, LuMail, LuPaperclip, LuPencil, LuTrash2 } from 'react-icons/lu';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { WorkflowInlineMenu } from './WorkflowInlineMenu';
import styles from './ProjectDetail.module.css';

export type WorkflowTaskRowActionsMenuProps = {
  readonly taskTitle: string;
  readonly disabled?: boolean;
  readonly canEdit?: boolean;
  readonly canDelete?: boolean;
  readonly showSendAttachment?: boolean;
  readonly showAssignedNotification?: boolean;
  readonly showEditNotes?: boolean;
  readonly editNotesLabel?: string;
  readonly dotsOrientation?: 'vertical' | 'horizontal';
  readonly actionsButtonRef?: MutableRefObject<HTMLButtonElement | null>;
  readonly onEdit?: () => void;
  readonly onEditNotes?: () => void;
  readonly onDelete?: () => void;
  readonly onSendAttachment?: () => void;
  readonly onNotifyAssigned?: () => void;
};

type ActionIconTone = 'attachment' | 'edit' | 'notes' | 'notify' | 'delete';

type WorkflowTaskRowMenuItem = {
  readonly key: string;
  readonly label: string;
  readonly onSelect: () => void;
  readonly variant?: 'danger';
  readonly tone: ActionIconTone;
  readonly icon: ReactNode;
};

const ACTION_ICON_TONE_CLASS: Record<ActionIconTone, string> = {
  attachment: styles.actionsMenuIconTile_attachment,
  edit: styles.actionsMenuIconTile_edit,
  notes: styles.actionsMenuIconTile_notes,
  notify: styles.actionsMenuIconTile_notify,
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

export function WorkflowTaskRowActionsMenu({
  taskTitle,
  disabled = false,
  canEdit = false,
  canDelete = false,
  showSendAttachment = false,
  showAssignedNotification = false,
  showEditNotes = false,
  editNotesLabel,
  dotsOrientation = 'vertical',
  actionsButtonRef,
  onEdit,
  onEditNotes,
  onDelete,
  onSendAttachment,
  onNotifyAssigned,
}: WorkflowTaskRowActionsMenuProps): ReactElement | null {
  const wf = content.projectDetail.workflow;
  const [open, setOpen] = useState(false);
  const internalButtonRef = useRef<HTMLButtonElement | null>(null);
  const iconProps = { size: 15, strokeWidth: 2.25 } as const;

  const setButtonRef = (element: HTMLButtonElement | null): void => {
    internalButtonRef.current = element;
    if (actionsButtonRef) {
      actionsButtonRef.current = element;
    }
  };

  const menuItems = useMemo((): readonly WorkflowTaskRowMenuItem[] => {
    const items: WorkflowTaskRowMenuItem[] = [];
    if (showSendAttachment && onSendAttachment) {
      items.push({
        key: 'send-attachment',
        label: wf.sendAttachment,
        onSelect: onSendAttachment,
        tone: 'attachment',
        icon: <LuPaperclip {...iconProps} />,
      });
    }
    if (canEdit && onEdit) {
      items.push({
        key: 'edit',
        label: wf.editTask,
        onSelect: onEdit,
        tone: 'edit',
        icon: <LuPencil {...iconProps} />,
      });
    }
    if (showEditNotes && onEditNotes) {
      items.push({
        key: 'notes',
        label: editNotesLabel ?? wf.addNotes,
        onSelect: onEditNotes,
        tone: 'notes',
        icon: <LuFileText {...iconProps} />,
      });
    }
    if (showAssignedNotification && onNotifyAssigned) {
      items.push({
        key: 'notify',
        label: wf.notifyAssigned,
        onSelect: onNotifyAssigned,
        tone: 'notify',
        icon: <LuMail {...iconProps} />,
      });
    }
    if (canDelete && onDelete) {
      items.push({
        key: 'delete',
        label: wf.deleteTask,
        onSelect: onDelete,
        variant: 'danger',
        tone: 'delete',
        icon: <LuTrash2 {...iconProps} />,
      });
    }
    return items;
  }, [
    canDelete,
    canEdit,
    editNotesLabel,
    onDelete,
    onEdit,
    onEditNotes,
    onNotifyAssigned,
    onSendAttachment,
    showAssignedNotification,
    showEditNotes,
    showSendAttachment,
    wf.addNotes,
    wf.deleteTask,
    wf.editTask,
    wf.notifyAssigned,
    wf.sendAttachment,
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
        ref={setButtonRef}
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
        <span
          className={
            dotsOrientation === 'horizontal'
              ? styles.taskActionsDotsHorizontal
              : styles.taskActionsDots
          }
          aria-hidden
        >
          {dotsOrientation === 'horizontal' ? '⋯' : '⋮'}
        </span>
      </button>
      <WorkflowInlineMenu
        open={open}
        onClose={closeMenu}
        anchorRef={internalButtonRef}
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
