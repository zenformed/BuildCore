'use client';

import type { ReactElement, ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  LuBan,
  LuClipboardList,
  LuDollarSign,
  LuDownload,
  LuFolder,
  LuPlay,
  LuQrCode,
  LuSave,
  LuShield,
  LuTrash2,
} from 'react-icons/lu';
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

type ActionIconTone =
  | 'workflow'
  | 'accountability'
  | 'financials'
  | 'documents'
  | 'qr'
  | 'load'
  | 'save'
  | 'inactive'
  | 'active'
  | 'delete';

function ActionsMenuSeparator(): ReactElement {
  return <div className={styles.actionsMenuSeparator} role="separator" aria-hidden />;
}

function ActionIcon({
  tone,
  children,
}: {
  readonly tone: ActionIconTone;
  readonly children: ReactNode;
}): ReactElement {
  return (
    <span
      className={[styles.actionsMenuIconTile, styles[`actionsMenuIconTile_${tone}`]].join(' ')}
      aria-hidden
    >
      {children}
    </span>
  );
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
  const deleteCopy = isSubproject ? detail.subprojects.delete : content.crm.delete;
  const inactiveCopy = content.projectDetail.subprojects.markInactive;
  const activeCopy = content.projectDetail.subprojects.markActive;
  const wf = detail.workflow;
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const isInactive = isCrmProjectInactive(projectSummary);
  const menuDisabled = deleting || lifecycleBusy;
  const showLifecycleActions = onRequestMarkInactive != null || onRequestMarkActive != null;
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
        maxHeightPx={640}
        portalClassName={`${styles.inlineMenu_portal} ${styles.actionsMenu_portal}`}
      >
        <button
          type="button"
          role="menuitem"
          className={`${styles.inlineMenuAction} ${styles.actionsMenuItem}`}
          disabled={menuDisabled}
          onClick={() => closeAndNavigate(routes.workflowTasks)}
        >
          <ActionIcon tone="workflow">
            <LuClipboardList size={15} strokeWidth={2.25} />
          </ActionIcon>
          {detail.actions.workflowTasks}
        </button>
        <button
          type="button"
          role="menuitem"
          className={`${styles.inlineMenuAction} ${styles.actionsMenuItem}`}
          disabled={menuDisabled}
          onClick={() => closeAndNavigate(routes.accountability)}
        >
          <ActionIcon tone="accountability">
            <LuShield size={15} strokeWidth={2.25} />
          </ActionIcon>
          {detail.actions.accountability}
        </button>
        <button
          type="button"
          role="menuitem"
          className={`${styles.inlineMenuAction} ${styles.actionsMenuItem}`}
          disabled={menuDisabled}
          onClick={() => closeAndNavigate(routes.financials)}
        >
          <ActionIcon tone="financials">
            <LuDollarSign size={15} strokeWidth={2.25} />
          </ActionIcon>
          {detail.actions.financials}
        </button>
        <button
          type="button"
          role="menuitem"
          className={`${styles.inlineMenuAction} ${styles.actionsMenuItem}`}
          disabled={menuDisabled}
          onClick={() => closeAndNavigate(routes.documents)}
        >
          <ActionIcon tone="documents">
            <LuFolder size={15} strokeWidth={2.25} />
          </ActionIcon>
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
            <ActionIcon tone="qr">
              <LuQrCode size={15} strokeWidth={2.25} />
            </ActionIcon>
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
              <ActionIcon tone="load">
                <LuDownload size={15} strokeWidth={2.25} />
              </ActionIcon>
              {loadTemplateLabel}
            </button>
            <button
              type="button"
              role="menuitem"
              className={`${styles.inlineMenuAction} ${styles.actionsMenuItem}`}
              disabled={menuDisabled}
              onClick={handleSaveTemplate}
            >
              <ActionIcon tone="save">
                <LuSave size={15} strokeWidth={2.25} />
              </ActionIcon>
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
              <ActionIcon tone="active">
                <LuPlay size={15} strokeWidth={2.25} />
              </ActionIcon>
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
              <ActionIcon tone="inactive">
                <LuBan size={15} strokeWidth={2.25} />
              </ActionIcon>
              {inactiveCopy.menuAction}
            </button>
          )
        ) : null}
        {canDelete ? (
          <button
            type="button"
            role="menuitem"
            className={`${styles.inlineMenuAction} ${styles.actionsMenuItem}`}
            disabled={menuDisabled}
            aria-label={deleteCopy.actionAriaLabel(projectSummary.name)}
            onClick={handleRequestDelete}
          >
            <ActionIcon tone="delete">
              <LuTrash2 size={15} strokeWidth={2.25} />
            </ActionIcon>
            {deleteCopy.action}
          </button>
        ) : null}
      </WorkflowInlineMenu>
    </>
  );
}
