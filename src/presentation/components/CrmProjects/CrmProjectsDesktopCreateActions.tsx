'use client';

import { useEffect, useRef, useState, type ReactElement } from 'react';
import { LuFileSpreadsheet } from 'react-icons/lu';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { useBuildCoreNavigation } from '@/presentation/providers/BuildCoreNavigationProvider';
import { DetailPanelHeaderButton } from '@/presentation/components/CrmProjectDetail/DetailPanelHeaderButton';
import { WorkflowInlineMenu } from '@/presentation/components/CrmProjectDetail/WorkflowInlineMenu';
import detailStyles from '@/presentation/components/CrmProjectDetail/ProjectDetail.module.css';
import styles from './CrmProjects.module.css';

export type CrmProjectsDesktopCreateActionsProps = {
  /** Desktop: labeled create button. Mobile: green + icon. */
  readonly variant?: 'desktop' | 'mobile';
  readonly createDisabled?: boolean;
  readonly importDisabled?: boolean;
  readonly onCreateClick: () => void;
  readonly onImportClick: () => void;
};

export function CrmProjectsDesktopCreateActions({
  variant = 'desktop',
  createDisabled = false,
  importDisabled = false,
  onCreateClick,
  onImportClick,
}: CrmProjectsDesktopCreateActionsProps): ReactElement {
  const panelCopy = content.crm.panel;
  const nav = useBuildCoreNavigation();
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const isMobile = variant === 'mobile';

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
    <div className={styles.desktopCreateActions}>
      {isMobile ? (
        <DetailPanelHeaderButton
          variant="add"
          disabled={createDisabled}
          title={nav.header.newProject.title}
          aria-label={nav.header.newProject.ariaLabel}
          onClick={onCreateClick}
        />
      ) : (
        <button
          type="button"
          className={styles.desktopCreateProjectBtn}
          disabled={createDisabled}
          title={panelCopy.createProjectAriaLabel}
          aria-label={panelCopy.createProjectAriaLabel}
          onClick={onCreateClick}
        >
          {panelCopy.createProjectButton}
        </button>
      )}
      <button
        ref={anchorRef}
        type="button"
        className={styles.rowActionsBtn}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={panelCopy.moreActionsAriaLabel}
        title={panelCopy.moreActionsAriaLabel}
        onClick={() => setOpen((value) => !value)}
      >
        <span className={styles.rowActionsDots} aria-hidden>
          ⋮
        </span>
      </button>
      <WorkflowInlineMenu
        open={open}
        onClose={closeMenu}
        anchorRef={anchorRef}
        align={isMobile ? 'end' : 'start'}
        sizeToContent
        portalClassName={`${detailStyles.inlineMenu_portal} ${styles.rowActionsMenuPortal}`}
      >
        <button
          type="button"
          role="menuitem"
          className={styles.rowActionsMenuItem}
          disabled={importDisabled}
          aria-label={panelCopy.importSpreadsheetAriaLabel}
          onClick={() => {
            closeMenu();
            onImportClick();
          }}
        >
          <span
            className={[styles.rowActionsMenuIconTile, styles.rowActionsMenuIconTile_import].join(
              ' '
            )}
            aria-hidden
          >
            <LuFileSpreadsheet size={15} strokeWidth={2.25} />
          </span>
          {panelCopy.importSpreadsheetMenu}
        </button>
      </WorkflowInlineMenu>
    </div>
  );
}
