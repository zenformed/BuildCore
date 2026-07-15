'use client';

import type { ReactElement } from 'react';
import { useEffect, useRef, useState } from 'react';
import type { CrmProjectSummary } from '@/domain/crm';
import { isCrmProjectComplete, isCrmProjectInactive } from '@/domain/crm';
import { isProjectPriorityUrgent } from '@/domain/crm/projectPriorityToggle';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { WorkflowInlineMenu } from '@/presentation/components/CrmProjectDetail/WorkflowInlineMenu';
import { CrmProjectStatusCircleIcon } from '@/presentation/components/crmShared/CrmProjectStatusCircleIcon';
import detailStyles from '@/presentation/components/CrmProjectDetail/ProjectDetail.module.css';
import styles from './CrmProjects.module.css';

export type CrmProjectTableRowActionsMenuProps = {
  readonly project: CrmProjectSummary;
  readonly busy?: boolean;
  readonly canDelete?: boolean;
  readonly onRequestDelete?: (project: CrmProjectSummary) => void;
  readonly onTogglePriority?: (project: CrmProjectSummary) => void | Promise<void>;
  readonly onRequestCompletionChange?: (project: CrmProjectSummary) => void;
  readonly onRequestMarkInactive?: (project: CrmProjectSummary) => void;
  readonly onRequestMarkActive?: (project: CrmProjectSummary) => void | Promise<void>;
};

export function CrmProjectTableRowActionsMenu({
  project,
  busy = false,
  canDelete = false,
  onRequestDelete,
  onTogglePriority,
  onRequestCompletionChange,
  onRequestMarkInactive,
  onRequestMarkActive,
}: CrmProjectTableRowActionsMenuProps): ReactElement {
  const tableCopy = content.crm.table;
  const deleteCopy =
    project.parentProjectId != null
      ? content.projectDetail.subprojects.delete
      : content.crm.delete;
  const inactiveCopy = content.projectDetail.subprojects.markInactive;
  const activeCopy = content.projectDetail.subprojects.markActive;
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const isComplete = isCrmProjectComplete(project);
  const isInactive = isCrmProjectInactive(project);
  const isPriority = isProjectPriorityUrgent(project.priority);
  const menuDisabled = busy;
  const completionLabel = isComplete ? tableCopy.markIncomplete : tableCopy.markComplete;
  const priorityLabel = isPriority ? tableCopy.removePriority : tableCopy.makePriority;

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
        portalClassName={`${detailStyles.inlineMenu_portal} ${detailStyles.actionsMenu_portal}`}
      >
        {canDelete ? (
          <button
            type="button"
            role="menuitem"
            className={`${detailStyles.inlineMenuAction} ${detailStyles.actionsMenuItem} ${detailStyles.actionsMenuItemDanger}`}
            disabled={menuDisabled}
            aria-label={deleteCopy.actionAriaLabel(project.name)}
            onClick={(event) => {
              event.stopPropagation();
              closeMenu();
              onRequestDelete?.(project);
            }}
          >
            <span
              className={`${detailStyles.actionsMenuIcon} ${detailStyles.actionsMenuDeleteIcon}`}
              aria-hidden
            />
            {tableCopy.deleteAction}
          </button>
        ) : null}
        {!isComplete && !isInactive ? (
          <button
            type="button"
            role="menuitem"
            className={`${detailStyles.inlineMenuAction} ${detailStyles.actionsMenuItem}`}
            disabled={menuDisabled}
            onClick={(event) => {
              event.stopPropagation();
              closeMenu();
              void onTogglePriority?.(project);
            }}
          >
            <span className={styles.rowActionsMenuStatusIcon} aria-hidden>
              <CrmProjectStatusCircleIcon kind="priority" active={!isPriority} size={14} />
            </span>
            {priorityLabel}
          </button>
        ) : null}
        {isInactive ? (
          <button
            type="button"
            role="menuitem"
            className={`${detailStyles.inlineMenuAction} ${detailStyles.actionsMenuItem}`}
            disabled={menuDisabled}
            aria-label={activeCopy.menuActionAriaLabel(project.name)}
            onClick={(event) => {
              event.stopPropagation();
              closeMenu();
              void onRequestMarkActive?.(project);
            }}
          >
            <span
              className={`${detailStyles.actionsMenuIcon} ${detailStyles.actionsMenuMarkActiveIcon}`}
              aria-hidden
            />
            {activeCopy.menuAction}
          </button>
        ) : (
          <button
            type="button"
            role="menuitem"
            className={`${detailStyles.inlineMenuAction} ${detailStyles.actionsMenuItem}`}
            disabled={menuDisabled}
            aria-label={inactiveCopy.menuActionAriaLabel(project.name)}
            onClick={(event) => {
              event.stopPropagation();
              closeMenu();
              onRequestMarkInactive?.(project);
            }}
          >
            <span
              className={`${detailStyles.actionsMenuIcon} ${detailStyles.actionsMenuMarkInactiveIcon}`}
              aria-hidden
            />
            {inactiveCopy.menuAction}
          </button>
        )}
        <button
          type="button"
          role="menuitem"
          className={`${detailStyles.inlineMenuAction} ${detailStyles.actionsMenuItem}`}
          disabled={menuDisabled}
          onClick={(event) => {
            event.stopPropagation();
            closeMenu();
            onRequestCompletionChange?.(project);
          }}
        >
          <span className={styles.rowActionsMenuStatusIcon} aria-hidden>
            {isComplete ? (
              <CrmProjectStatusCircleIcon kind="incomplete" active size={14} />
            ) : (
              <CrmProjectStatusCircleIcon kind="complete" active size={14} />
            )}
          </span>
          {completionLabel}
        </button>
      </WorkflowInlineMenu>
    </>
  );
}
