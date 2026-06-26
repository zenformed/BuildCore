'use client';

import type { FocusEvent, MouseEvent, ReactElement, RefObject } from 'react';
import { useCallback, useId, useRef, useState } from 'react';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { WorkflowInlineMenu } from './WorkflowInlineMenu';
import styles from './ProjectDetail.module.css';

const HIDE_DELAY_MS = 200;

export type SummaryContactValuesPopoverKind = 'email' | 'phone';
export type ContactPopoverInteractionMode = 'hover' | 'tap';

export type UseSummaryContactValuesPopoverOptions = {
  readonly kind: SummaryContactValuesPopoverKind;
  readonly values: readonly string[];
  readonly formatDisplayValue: (value: string) => string;
  readonly getCopyValue: (value: string) => string;
  readonly onCopied: (message: string) => void;
  readonly enabled?: boolean;
  readonly interactionMode?: ContactPopoverInteractionMode;
};

export type SummaryContactValuesToggleButtonProps = {
  readonly type: 'button';
  readonly 'aria-expanded': boolean;
  readonly 'aria-haspopup': 'dialog';
  readonly 'aria-label': string;
  readonly onClick: (event: MouseEvent<HTMLButtonElement>) => void;
};

export type SummaryContactValuesPopoverAnchor = {
  anchorRef: RefObject<HTMLDivElement | null>;
  readonly anchorHandlers: {
    readonly onMouseEnter?: () => void;
    readonly onMouseLeave?: () => void;
    readonly onFocus?: () => void;
    readonly onBlur?: (event: FocusEvent<HTMLDivElement>) => void;
  };
  readonly toggleButtonProps: SummaryContactValuesToggleButtonProps | null;
  readonly open: boolean;
  readonly menu: ReactElement | null;
};

export function useSummaryContactValuesPopover({
  kind,
  values,
  formatDisplayValue,
  getCopyValue,
  onCopied,
  enabled = true,
  interactionMode = 'hover',
}: UseSummaryContactValuesPopoverOptions): SummaryContactValuesPopoverAnchor {
  const anchorRef = useRef<HTMLDivElement>(null);
  const hideTimerRef = useRef<number | null>(null);
  const [open, setOpen] = useState(false);
  const popoverId = useId();
  const copyContent = content.projectDetail.contactValues;
  const copiedMessage = kind === 'email' ? copyContent.emailCopied : copyContent.phoneCopied;
  const regionLabel =
    kind === 'email' ? copyContent.allEmailsAriaLabel : copyContent.allPhonesAriaLabel;
  const isActive = enabled && values.length > 0;
  const isTapMode = interactionMode === 'tap';

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current != null) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const show = useCallback(() => {
    if (!isActive) return;
    clearHideTimer();
    setOpen(true);
  }, [clearHideTimer, isActive]);

  const hide = useCallback(() => {
    clearHideTimer();
    setOpen(false);
  }, [clearHideTimer]);

  const toggle = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      event.preventDefault();
      if (!isActive) return;
      clearHideTimer();
      setOpen((current) => !current);
    },
    [clearHideTimer, isActive]
  );

  const scheduleHide = useCallback(() => {
    if (isTapMode) return;
    clearHideTimer();
    hideTimerRef.current = window.setTimeout(() => {
      hideTimerRef.current = null;
      setOpen(false);
    }, HIDE_DELAY_MS);
  }, [clearHideTimer, isTapMode]);

  const handleBlur = useCallback(
    (event: FocusEvent<HTMLDivElement>) => {
      if (isTapMode) return;
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
    [isTapMode, popoverId]
  );

  const copyValue = useCallback(
    async (rawValue: string) => {
      const display = formatDisplayValue(rawValue);
      const copyText = getCopyValue(rawValue).trim() || display.trim();
      if (!copyText) return;
      try {
        await navigator.clipboard.writeText(copyText);
        onCopied(copiedMessage);
      } catch {
        // Clipboard unavailable — no toast; user can select text manually.
      }
    },
    [copiedMessage, formatDisplayValue, getCopyValue, onCopied]
  );

  const toggleAriaLabel = open
    ? kind === 'email'
      ? copyContent.hideEmailsToggleAriaLabel
      : copyContent.hidePhonesToggleAriaLabel
    : kind === 'email'
      ? copyContent.showEmailsToggleAriaLabel
      : copyContent.showPhonesToggleAriaLabel;

  const menu =
    isActive && open ? (
      <WorkflowInlineMenu
        open
        onClose={hide}
        anchorRef={anchorRef as RefObject<HTMLElement | null>}
        portalClassName={`${styles.inlineMenu_portal} ${styles.summaryContactPopover_portal}`}
        sizeToContent={false}
        menuGapPx={0}
        portalHandlers={
          isTapMode
            ? undefined
            : {
                onMouseEnter: show,
                onMouseLeave: scheduleHide,
              }
        }
      >
        <div
          id={popoverId}
          role="region"
          aria-label={regionLabel}
          className={styles.summaryContactPopoverPanel}
        >
          {values.map((value, index) => {
            const display = formatDisplayValue(value);
            if (!display.trim()) return null;
            const copyAriaLabel =
              kind === 'email'
                ? copyContent.copyEmailAriaLabel(display)
                : copyContent.copyPhoneAriaLabel(display);

            return (
              <div key={`${index}-${value}`} className={styles.summaryContactPopoverRow}>
                <span className={styles.summaryContactPopoverValue}>{display}</span>
                <button
                  type="button"
                  className={styles.summaryContactPopoverCopyBtn}
                  aria-label={copyAriaLabel}
                  onClick={() => void copyValue(value)}
                >
                  <span className={styles.summaryContactPopoverCopyIcon} aria-hidden />
                </button>
              </div>
            );
          })}
        </div>
      </WorkflowInlineMenu>
    ) : null;

  const anchorHandlers = isTapMode
    ? {}
    : {
        onMouseEnter: show,
        onMouseLeave: scheduleHide,
        onFocus: show,
        onBlur: handleBlur,
      };

  const toggleButtonProps: SummaryContactValuesToggleButtonProps | null =
    isActive && isTapMode
      ? {
          type: 'button',
          'aria-expanded': open,
          'aria-haspopup': 'dialog',
          'aria-label': toggleAriaLabel,
          onClick: toggle,
        }
      : null;

  return {
    anchorRef,
    anchorHandlers,
    toggleButtonProps,
    open,
    menu,
  };
}
