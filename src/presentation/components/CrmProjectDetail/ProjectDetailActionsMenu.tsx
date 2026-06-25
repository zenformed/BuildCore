'use client';

import type { ReactElement } from 'react';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { CrmProjectSummary } from '@/domain/crm';
import { isCrmProjectInactive } from '@/domain/crm';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import type { ProjectDetailRoutes } from '@/platform/navigation/projectDetailRoutes';
import { WorkflowInlineMenu } from './WorkflowInlineMenu';
import styles from './ProjectDetail.module.css';

export type ProjectDetailActionsMenuProps = {
  routes: ProjectDetailRoutes;
  projectSummary: CrmProjectSummary;
  canDelete: boolean;
  canSaveTemplate: boolean;
  loadTemplateLabel: string;
  saveTemplateLabel: string;
  deleting: boolean;
  onRequestDelete: (project: CrmProjectSummary) => void;
  onSaveTemplate: () => void;
  onLoadTemplate: () => void;
  canShowQrCode?: boolean;
  onShowQrCode?: () => void;
  isSubproject?: boolean;
  onRequestMarkInactive?: () => void;
  onRequestMarkActive?: () => void;
  lifecycleBusy?: boolean;
};

function ActionsMenuSeparator(): ReactElement {
  return <div className={styles.actionsMenuSeparator} role="separator" aria-hidden />;
}

export function ProjectDetailActionsMenu({
  routes,
  projectSummary,
  canDelete,
  canSaveTemplate,
  loadTemplateLabel,
  saveTemplateLabel,
  deleting,
  onRequestDelete,
  onSaveTemplate,
  onLoadTemplate,
  canShowQrCode = false,
  onShowQrCode,
  isSubproject = false,
  onRequestMarkInactive,
  onRequestMarkActive,
  lifecycleBusy = false,
}: ProjectDetailActionsMenuProps): ReactElement {
  const router = useRouter();
  const detail = content.projectDetail;
  const deleteCopy = content.crm.delete;
  const inactiveCopy = content.projectDetail.subprojects.markInactive;
  const activeCopy = content.projectDetail.subprojects.markActive;
  const wf = detail.workflow;
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const isInactive = isCrmProjectInactive(projectSummary);
  const menuDisabled = deleting || lifecycleBusy;
  const showLifecycleActions = isSubproject && (onRequestMarkInactive != null || onRequestMarkActive != null);
  const showActionSection = showLifecycleActions || canDelete;

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  const closeAndNavigate = (path: string) => {
    if (menuDisabled) return;
    setOpen(false);
    router.push(path);
  };

  const handleRequestDelete = () => {
    setOpen(false);
    onRequestDelete(projectSummary);
  };

  const handleSaveTemplate = () => {
    setOpen(false);
    onSaveTemplate();
  };

  const handleLoadTemplate = () => {
    setOpen(false);
    onLoadTemplate();
  };

  const handleShowQrCode = () => {
    setOpen(false);
    onShowQrCode?.();
  };

  const handleMarkInactive = () => {
    setOpen(false);
    onRequestMarkInactive?.();
  };

  const handleMarkActive = () => {
    setOpen(false);
    void onRequestMarkActive?.();
  };

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        className={styles.headerIconBtn}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={detail.actionsButton}
        title={detail.actionsButton}
        disabled={menuDisabled}
        onClick={() => setOpen((value) => !value)}
      >
        <span className={`${styles.headerIconMark} ${styles.headerIconDots}`} aria-hidden>
          ⋮
        </span>
      </button>
      <WorkflowInlineMenu
        open={open}
        onClose={() => setOpen(false)}
        anchorRef={anchorRef}
        align="end"
        sizeToContent
        portalClassName={`${styles.inlineMenu_portal} ${styles.actionsMenu_portal}`}
      >
        <button
          type="button"
          role="menuitem"
          className={`${styles.inlineMenuAction} ${styles.actionsMenuItem}`}
          disabled={menuDisabled}
          onClick={() => closeAndNavigate(routes.workflowTasks)}
        >
          <span className={`${styles.actionsMenuIcon} ${styles.actionsMenuWorkflowIcon}`} aria-hidden />
          {detail.actions.workflowTasks}
        </button>
        <button
          type="button"
          role="menuitem"
          className={`${styles.inlineMenuAction} ${styles.actionsMenuItem}`}
          disabled={menuDisabled}
          onClick={() => closeAndNavigate(routes.accountability)}
        >
          <span
            className={`${styles.actionsMenuIcon} ${styles.actionsMenuAccountabilityIcon}`}
            aria-hidden
          />
          {detail.actions.accountability}
        </button>
        <button
          type="button"
          role="menuitem"
          className={`${styles.inlineMenuAction} ${styles.actionsMenuItem}`}
          disabled={menuDisabled}
          onClick={() => closeAndNavigate(routes.financials)}
        >
          <span className={`${styles.actionsMenuIcon} ${styles.actionsMenuFinancialsIcon}`} aria-hidden />
          {detail.actions.financials}
        </button>
        <button
          type="button"
          role="menuitem"
          className={`${styles.inlineMenuAction} ${styles.actionsMenuItem}`}
          disabled={menuDisabled}
          onClick={() => closeAndNavigate(routes.documents)}
        >
          <span className={`${styles.actionsMenuIcon} ${styles.actionsMenuFolderIcon}`} aria-hidden />
          {wf.openDocuments}
        </button>
        {canShowQrCode ? (
          <button
            type="button"
            role="menuitem"
            className={`${styles.inlineMenuAction} ${styles.actionsMenuItem}`}
            disabled={menuDisabled}
            onClick={handleShowQrCode}
          >
            <span className={`${styles.actionsMenuIcon} ${styles.actionsMenuQrIcon}`} aria-hidden />
            {detail.actions.showQrCode}
          </button>
        ) : null}
        {canSaveTemplate || showActionSection ? <ActionsMenuSeparator /> : null}
        {canSaveTemplate ? (
          <>
            <button
              type="button"
              role="menuitem"
              className={`${styles.inlineMenuAction} ${styles.actionsMenuItem}`}
              disabled={menuDisabled}
              onClick={handleLoadTemplate}
            >
              <span
                className={`${styles.actionsMenuIcon} ${styles.actionsMenuLoadTemplateIcon}`}
                aria-hidden
              />
              {loadTemplateLabel}
            </button>
            <button
              type="button"
              role="menuitem"
              className={`${styles.inlineMenuAction} ${styles.actionsMenuItem}`}
              disabled={menuDisabled}
              onClick={handleSaveTemplate}
            >
              <span
                className={`${styles.actionsMenuIcon} ${styles.actionsMenuSaveTemplateIcon}`}
                aria-hidden
              />
              {saveTemplateLabel}
            </button>
          </>
        ) : null}
        {showActionSection ? <ActionsMenuSeparator /> : null}
        {showLifecycleActions ? (
          isInactive ? (
            <button
              type="button"
              role="menuitem"
              className={`${styles.inlineMenuAction} ${styles.actionsMenuItem}`}
              disabled={menuDisabled}
              aria-label={activeCopy.menuActionAriaLabel(projectSummary.name)}
              onClick={handleMarkActive}
            >
              <span
                className={`${styles.actionsMenuIcon} ${styles.actionsMenuMarkActiveIcon}`}
                aria-hidden
              />
              {activeCopy.menuAction}
            </button>
          ) : (
            <button
              type="button"
              role="menuitem"
              className={`${styles.inlineMenuAction} ${styles.actionsMenuItem}`}
              disabled={menuDisabled}
              aria-label={inactiveCopy.menuActionAriaLabel(projectSummary.name)}
              onClick={handleMarkInactive}
            >
              <span
                className={`${styles.actionsMenuIcon} ${styles.actionsMenuMarkInactiveIcon}`}
                aria-hidden
              />
              {inactiveCopy.menuAction}
            </button>
          )
        ) : null}
        {canDelete ? (
          <button
            type="button"
            role="menuitem"
            className={`${styles.inlineMenuAction} ${styles.actionsMenuItem} ${styles.actionsMenuItemDanger}`}
            disabled={menuDisabled}
            aria-label={deleteCopy.actionAriaLabel(projectSummary.name)}
            onClick={handleRequestDelete}
          >
            <span className={`${styles.actionsMenuIcon} ${styles.actionsMenuDeleteIcon}`} aria-hidden />
            {deleteCopy.action}
          </button>
        ) : null}
      </WorkflowInlineMenu>
    </>
  );
}
