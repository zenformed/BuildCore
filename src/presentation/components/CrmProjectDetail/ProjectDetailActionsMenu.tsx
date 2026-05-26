'use client';

import type { ReactElement } from 'react';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { CrmProjectSummary } from '@/domain/crm';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { buildCoreDashboardNavigation as nav } from '@/platform/navigation/buildCoreDashboardNavigation';
import { WorkflowInlineMenu } from './WorkflowInlineMenu';
import styles from './ProjectDetail.module.css';

export type ProjectDetailActionsMenuProps = {
  projectSlug: string;
  projectSummary: CrmProjectSummary;
  canDelete: boolean;
  canSaveTemplate: boolean;
  deleting: boolean;
  onRequestDelete: (project: CrmProjectSummary) => void;
  onSaveTemplate: () => void;
  onLoadTemplate: () => void;
};

export function ProjectDetailActionsMenu({
  projectSlug,
  projectSummary,
  canDelete,
  canSaveTemplate,
  deleting,
  onRequestDelete,
  onSaveTemplate,
  onLoadTemplate,
}: ProjectDetailActionsMenuProps): ReactElement {
  const router = useRouter();
  const detail = content.projectDetail;
  const deleteCopy = content.crm.delete;
  const wf = detail.workflow;
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const menuDisabled = deleting;

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

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        className={`${styles.stageChip} ${styles.headerChipBtn}`}
        aria-expanded={open}
        aria-haspopup="menu"
        disabled={menuDisabled}
        onClick={() => setOpen((value) => !value)}
      >
        {detail.actionsButton}
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
          onClick={() => closeAndNavigate(nav.routes.projectWorkflowTasks(projectSlug))}
        >
          <span className={`${styles.actionsMenuIcon} ${styles.actionsMenuWorkflowIcon}`} aria-hidden />
          {detail.actions.workflowTasks}
        </button>
        <button
          type="button"
          role="menuitem"
          className={`${styles.inlineMenuAction} ${styles.actionsMenuItem}`}
          disabled={menuDisabled}
          onClick={() => closeAndNavigate(nav.routes.projectAccountability(projectSlug))}
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
          onClick={() => closeAndNavigate(nav.routes.projectFinancials(projectSlug))}
        >
          <span className={`${styles.actionsMenuIcon} ${styles.actionsMenuFinancialsIcon}`} aria-hidden />
          {detail.actions.financials}
        </button>
        <button
          type="button"
          role="menuitem"
          className={`${styles.inlineMenuAction} ${styles.actionsMenuItem}`}
          disabled={menuDisabled}
          onClick={() => closeAndNavigate(nav.routes.projectDocuments(projectSlug))}
        >
          <span className={`${styles.actionsMenuIcon} ${styles.actionsMenuFolderIcon}`} aria-hidden />
          {wf.openDocuments}
        </button>
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
              {detail.actions.loadTemplate}
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
              {detail.actions.saveTemplate}
            </button>
          </>
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
