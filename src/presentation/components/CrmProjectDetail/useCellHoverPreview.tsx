'use client';

import type { FocusEvent, ReactElement, ReactNode, RefObject } from 'react';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { WorkflowInlineMenu } from './WorkflowInlineMenu';
import styles from './ProjectDetail.module.css';

const SHOW_DELAY_MS = 160;
const HIDE_DELAY_MS = 200;

export type UseCellHoverPreviewOptions = {
  readonly enabled?: boolean;
  readonly ariaLabel: string;
  readonly children: ReactNode;
  readonly panelClassName?: string;
  readonly portalClassName?: string;
};

export type CellHoverPreviewAnchor = {
  readonly anchorRef: RefObject<HTMLElement | null>;
  readonly anchorHandlers: {
    readonly onMouseEnter?: () => void;
    readonly onMouseLeave?: () => void;
    readonly onFocus?: () => void;
    readonly onBlur?: (event: FocusEvent<HTMLElement>) => void;
  };
  readonly open: boolean;
  readonly hide: () => void;
  readonly menu: ReactElement | null;
};

/**
 * Lightweight hover/focus preview for truncated table cells.
 * Reuses WorkflowInlineMenu portal positioning (same family as task/contact previews).
 */
export function useCellHoverPreview({
  enabled = true,
  ariaLabel,
  children,
  panelClassName,
  portalClassName,
}: UseCellHoverPreviewOptions): CellHoverPreviewAnchor {
  const anchorRef = useRef<HTMLElement | null>(null);
  const showTimerRef = useRef<number | null>(null);
  const hideTimerRef = useRef<number | null>(null);
  const [open, setOpen] = useState(false);
  const popoverId = useId();

  const clearShowTimer = useCallback(() => {
    if (showTimerRef.current != null) {
      window.clearTimeout(showTimerRef.current);
      showTimerRef.current = null;
    }
  }, []);

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current != null) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const hide = useCallback(() => {
    clearShowTimer();
    clearHideTimer();
    setOpen(false);
  }, [clearHideTimer, clearShowTimer]);

  const show = useCallback(() => {
    if (!enabled) return;
    clearHideTimer();
    clearShowTimer();
    showTimerRef.current = window.setTimeout(() => {
      showTimerRef.current = null;
      setOpen(true);
    }, SHOW_DELAY_MS);
  }, [clearHideTimer, clearShowTimer, enabled]);

  const scheduleHide = useCallback(() => {
    clearShowTimer();
    clearHideTimer();
    hideTimerRef.current = window.setTimeout(() => {
      hideTimerRef.current = null;
      setOpen(false);
    }, HIDE_DELAY_MS);
  }, [clearHideTimer, clearShowTimer]);

  const handleBlur = useCallback(
    (event: FocusEvent<HTMLElement>) => {
      const next = event.relatedTarget;
      window.setTimeout(() => {
        const active = document.activeElement;
        if (active instanceof Node) {
          if (anchorRef.current?.contains(active)) return;
          const popover = document.getElementById(popoverId);
          if (popover?.contains(active)) return;
        }
        if (next instanceof Node) {
          if (anchorRef.current?.contains(next)) return;
          const popover = document.getElementById(popoverId);
          if (popover?.contains(next)) return;
        }
        setOpen(false);
      }, 0);
    },
    [popoverId]
  );

  useEffect(() => {
    if (!enabled && open) hide();
  }, [enabled, hide, open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') hide();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [hide, open]);

  useEffect(
    () => () => {
      clearShowTimer();
      clearHideTimer();
    },
    [clearHideTimer, clearShowTimer]
  );

  const menu =
    enabled && open ? (
      <WorkflowInlineMenu
        open
        onClose={hide}
        anchorRef={anchorRef}
        portalClassName={
          portalClassName ??
          `${styles.inlineMenu_portal} ${styles.cellHoverPreview_portal}`
        }
        sizeToContent
        align="start"
        menuGapPx={6}
        disablePortalScroll
        portalHandlers={{
          onMouseEnter: () => {
            clearShowTimer();
            clearHideTimer();
            setOpen(true);
          },
          onMouseLeave: scheduleHide,
        }}
      >
        <div
          id={popoverId}
          role="region"
          aria-label={ariaLabel}
          className={panelClassName ?? styles.cellHoverPreviewPanel}
        >
          {children}
        </div>
      </WorkflowInlineMenu>
    ) : null;

  return {
    anchorRef,
    anchorHandlers: enabled
      ? {
          onMouseEnter: show,
          onMouseLeave: scheduleHide,
          onFocus: show,
          onBlur: handleBlur,
        }
      : {},
    open,
    hide,
    menu,
  };
}
