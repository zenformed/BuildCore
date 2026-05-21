'use client';

import type { ReactElement } from 'react';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { buildCoreDashboardNavigation as nav } from '@/platform/navigation/buildCoreDashboardNavigation';
import { WorkflowInlineMenu } from './WorkflowInlineMenu';
import styles from './ProjectDetail.module.css';

export type ProjectDetailActionsMenuProps = {
  projectSlug: string;
};

export function ProjectDetailActionsMenu({ projectSlug }: ProjectDetailActionsMenuProps): ReactElement {
  const router = useRouter();
  const detail = content.projectDetail;
  const wf = detail.workflow;
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  const closeAndNavigate = (path: string) => {
    setOpen(false);
    router.push(path);
  };

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        className={`${styles.stageChip} ${styles.headerChipBtn}`}
        aria-expanded={open}
        aria-haspopup="menu"
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
          onClick={() => closeAndNavigate(nav.routes.projectWorkflowTasks(projectSlug))}
        >
          <span className={`${styles.actionsMenuIcon} ${styles.actionsMenuWorkflowIcon}`} aria-hidden />
          {detail.actions.workflowTasks}
        </button>
        <button
          type="button"
          role="menuitem"
          className={`${styles.inlineMenuAction} ${styles.actionsMenuItem}`}
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
          onClick={() => closeAndNavigate(nav.routes.projectFinancials(projectSlug))}
        >
          <span className={`${styles.actionsMenuIcon} ${styles.actionsMenuFinancialsIcon}`} aria-hidden />
          {detail.actions.financials}
        </button>
        <button
          type="button"
          role="menuitem"
          className={`${styles.inlineMenuAction} ${styles.actionsMenuItem}`}
          onClick={() => closeAndNavigate(nav.routes.projectDocuments(projectSlug))}
        >
          <span className={`${styles.actionsMenuIcon} ${styles.actionsMenuFolderIcon}`} aria-hidden />
          {wf.openDocuments}
        </button>
      </WorkflowInlineMenu>
    </>
  );
}
