'use client';

/**
 * Desktop ⋮ menu for project-detail folder tab headers (to the right of +).
 * Matches Subprojects: Refresh (and optional Mark Complete) live here instead of
 * as standalone icon buttons.
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import { BsCheckLg } from 'react-icons/bs';
import { LuRefreshCw } from 'react-icons/lu';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { WorkflowInlineMenu } from './WorkflowInlineMenu';
import projectsStyles from '@/presentation/components/CrmProjects/CrmProjects.module.css';
import styles from './ProjectDetail.module.css';

export type DetailPanelHeaderMoreMenuCompleteAction = {
  readonly label: string;
  readonly disabled?: boolean;
  readonly onClick: () => void;
};

export type DetailPanelHeaderMoreMenuRefreshAction = {
  readonly sectionLabel: string;
  readonly onRefresh: () => Promise<void>;
  readonly onError?: (message: string) => void;
};

export type DetailPanelHeaderMoreMenuProps = {
  /** Optional Mark Complete / checkmark action (Workflow). */
  readonly completeAction?: DetailPanelHeaderMoreMenuCompleteAction | null;
  /** Optional Refresh action. */
  readonly refreshAction?: DetailPanelHeaderMoreMenuRefreshAction | null;
  /** Extra menu items rendered after built-in actions. */
  readonly children?: ReactNode;
};

export function DetailPanelHeaderMoreMenu({
  completeAction = null,
  refreshAction = null,
  children = null,
}: DetailPanelHeaderMoreMenuProps): ReactElement | null {
  const panelCopy = content.crm.panel;
  const actionsCopy = content.projectDetail.actions;
  const [menuOpen, setMenuOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);

  const hasComplete = completeAction != null;
  const hasRefresh = refreshAction != null;
  const hasExtra = children != null && children !== false && children !== true;
  const showMenu = hasComplete || hasRefresh || hasExtra;

  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [menuOpen]);

  const closeMenu = useCallback((): void => {
    setMenuOpen(false);
  }, []);

  const handleRefresh = useCallback(async () => {
    if (refreshAction == null || refreshing) return;
    setRefreshing(true);
    try {
      await refreshAction.onRefresh();
    } catch {
      refreshAction.onError?.(actionsCopy.refreshFailed);
    } finally {
      setRefreshing(false);
    }
  }, [actionsCopy.refreshFailed, refreshAction, refreshing]);

  if (!showMenu) return null;

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        className={projectsStyles.rowActionsBtn}
        aria-expanded={menuOpen}
        aria-haspopup="menu"
        aria-label={panelCopy.moreActionsAriaLabel}
        title={panelCopy.moreActionsAriaLabel}
        onClick={() => setMenuOpen((value) => !value)}
      >
        <span className={projectsStyles.rowActionsDots} aria-hidden>
          ⋮
        </span>
      </button>
      <WorkflowInlineMenu
        open={menuOpen}
        onClose={closeMenu}
        anchorRef={anchorRef}
        align="start"
        sizeToContent
        portalClassName={`${styles.inlineMenu_portal} ${projectsStyles.rowActionsMenuPortal}`}
      >
        {completeAction != null ? (
          <button
            type="button"
            role="menuitem"
            className={projectsStyles.rowActionsMenuItem}
            disabled={completeAction.disabled === true}
            aria-label={completeAction.label}
            onClick={() => {
              if (completeAction.disabled) return;
              closeMenu();
              completeAction.onClick();
            }}
          >
            <span
              className={[
                projectsStyles.rowActionsMenuIconTile,
                projectsStyles.rowActionsMenuIconTile_complete,
              ].join(' ')}
              aria-hidden
            >
              <BsCheckLg size={15} />
            </span>
            {completeAction.label}
          </button>
        ) : null}
        {refreshAction != null ? (
          <button
            type="button"
            role="menuitem"
            className={projectsStyles.rowActionsMenuItem}
            disabled={refreshing}
            aria-label={
              refreshing
                ? actionsCopy.refreshingSectionAria(refreshAction.sectionLabel)
                : actionsCopy.refreshSectionAria(refreshAction.sectionLabel)
            }
            onClick={() => {
              closeMenu();
              void handleRefresh();
            }}
          >
            <span
              className={[
                projectsStyles.rowActionsMenuIconTile,
                projectsStyles.rowActionsMenuIconTile_refresh,
              ].join(' ')}
              aria-hidden
            >
              <LuRefreshCw size={15} strokeWidth={2.25} />
            </span>
            {refreshing ? actionsCopy.refreshingSection : actionsCopy.refreshSection}
          </button>
        ) : null}
        {children != null ? (
          <div
            onClick={(event) => {
              const target = event.target;
              if (!(target instanceof Element)) return;
              if (target.closest('[role="menuitem"]') != null) closeMenu();
            }}
          >
            {children}
          </div>
        ) : null}
      </WorkflowInlineMenu>
    </>
  );
}
