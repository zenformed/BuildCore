'use client';

import type { ReactElement, ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { LuCircleAlert, LuTrash2 } from 'react-icons/lu';
import type { CrmProjectSummary } from '@/domain/crm';
import { isCrmProjectComplete, isCrmProjectInactive } from '@/domain/crm';
import { isProjectPriorityUrgent } from '@/domain/crm/projectPriorityToggle';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { WorkflowInlineMenu } from '@/presentation/components/CrmProjectDetail/WorkflowInlineMenu';
import detailStyles from '@/presentation/components/CrmProjectDetail/ProjectDetail.module.css';
import styles from './CrmProjects.module.css';

export type CrmProjectTableRowActionsMenuProps = {
  readonly project: CrmProjectSummary;
  readonly busy?: boolean;
  readonly canDelete?: boolean;
  readonly onRequestDelete?: (project: CrmProjectSummary) => void;
  readonly onTogglePriority?: (project: CrmProjectSummary) => void | Promise<void>;
};

type ActionIconTone = 'delete' | 'priority';

function ActionIcon({
  tone,
  children,
}: {
  readonly tone: ActionIconTone;
  readonly children: ReactNode;
}): ReactElement {
  return (
    <span
      className={[styles.rowActionsMenuIconTile, styles[`rowActionsMenuIconTile_${tone}`]].join(
        ' '
      )}
      aria-hidden
    >
      {children}
    </span>
  );
}

export function CrmProjectTableRowActionsMenu({
  project,
  busy = false,
  canDelete = false,
  onRequestDelete,
  onTogglePriority,
}: CrmProjectTableRowActionsMenuProps): ReactElement | null {
  const tableCopy = content.crm.table;
  const deleteCopy =
    project.parentProjectId != null
      ? content.projectDetail.subprojects.delete
      : content.crm.delete;
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const isComplete = isCrmProjectComplete(project);
  const isInactive = isCrmProjectInactive(project);
  const isPriority = isProjectPriorityUrgent(project.priority);
  const menuDisabled = busy;
  const canTogglePriority =
    onTogglePriority != null && !isComplete && !isInactive;
  const showDelete = canDelete && onRequestDelete != null;
  const priorityLabel = isPriority ? tableCopy.removePriority : tableCopy.makePriority;

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  if (!canTogglePriority && !showDelete) {
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
        className={styles.rowActionsBtn}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={tableCopy.actionsMenuAriaLabel(project.name)}
        title={content.projectDetail.actionsButton}
        disabled={menuDisabled}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((value) => !value);
        }}
      >
        <span className={styles.rowActionsDots} aria-hidden>
          ⋮
        </span>
      </button>
      <WorkflowInlineMenu
        open={open}
        onClose={closeMenu}
        anchorRef={anchorRef}
        align="end"
        sizeToContent
        portalClassName={`${detailStyles.inlineMenu_portal} ${styles.rowActionsMenuPortal}`}
      >
        {canTogglePriority ? (
          <button
            type="button"
            role="menuitem"
            className={styles.rowActionsMenuItem}
            disabled={menuDisabled}
            onClick={(event) => {
              event.stopPropagation();
              closeMenu();
              void onTogglePriority(project);
            }}
          >
            <ActionIcon tone="priority">
              <LuCircleAlert size={15} strokeWidth={2.25} />
            </ActionIcon>
            {priorityLabel}
          </button>
        ) : null}
        {showDelete ? (
          <button
            type="button"
            role="menuitem"
            className={styles.rowActionsMenuItem}
            disabled={menuDisabled}
            aria-label={deleteCopy.actionAriaLabel(project.name)}
            onClick={(event) => {
              event.stopPropagation();
              closeMenu();
              onRequestDelete(project);
            }}
          >
            <ActionIcon tone="delete">
              <LuTrash2 size={15} strokeWidth={2.25} />
            </ActionIcon>
            {tableCopy.deleteAction}
          </button>
        ) : null}
      </WorkflowInlineMenu>
    </>
  );
}
