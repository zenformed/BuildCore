'use client';

import type { FocusEvent, MouseEvent, ReactElement, RefObject } from 'react';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { CrmWorkflowTask } from '@/domain/crm';
import type {
  WorkflowTaskCustomFieldDefinition,
  WorkflowTaskCustomFieldScope,
} from '@/domain/buildcore/workflowTaskCustomFields';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { WorkflowInlineMenu } from './WorkflowInlineMenu';
import { WorkflowTaskPreviewCard } from './WorkflowTaskPreviewCard';
import cardStyles from './WorkflowTaskPreviewCard.module.css';

const HIDE_DELAY_MS = 200;

export type WorkflowTaskPreviewInteractionMode = 'hover' | 'tap';

export type UseWorkflowTaskPreviewPopoverOptions = {
  readonly task: CrmWorkflowTask;
  readonly scope: WorkflowTaskCustomFieldScope;
  readonly customFieldDefinitions: readonly WorkflowTaskCustomFieldDefinition[];
  readonly stageLabel?: string | null;
  readonly documentCount: number;
  readonly enabled?: boolean;
  readonly interactionMode?: WorkflowTaskPreviewInteractionMode;
  readonly showOpenDetails?: boolean;
  readonly onOpenDetails?: () => void;
};

export type WorkflowTaskPreviewToggleButtonProps = {
  readonly type: 'button';
  readonly className: string;
  readonly 'aria-expanded': boolean;
  readonly 'aria-haspopup': 'dialog';
  readonly 'aria-controls': string;
  readonly 'aria-label': string;
  readonly onClick: (event: MouseEvent<HTMLButtonElement>) => void;
};

export type WorkflowTaskPreviewPopoverAnchor = {
  readonly anchorRef: RefObject<HTMLDivElement | null>;
  readonly anchorHandlers: {
    readonly onMouseEnter?: () => void;
    readonly onMouseLeave?: () => void;
    readonly onFocus?: () => void;
    readonly onBlur?: (event: FocusEvent<HTMLDivElement>) => void;
  };
  readonly toggleButtonProps: WorkflowTaskPreviewToggleButtonProps | null;
  readonly open: boolean;
  readonly menu: ReactElement | null;
};

export function useWorkflowTaskPreviewPopover({
  task,
  scope,
  customFieldDefinitions,
  stageLabel,
  documentCount,
  enabled = true,
  interactionMode = 'hover',
  showOpenDetails = false,
  onOpenDetails,
}: UseWorkflowTaskPreviewPopoverOptions): WorkflowTaskPreviewPopoverAnchor {
  const anchorRef = useRef<HTMLDivElement>(null);
  const hideTimerRef = useRef<number | null>(null);
  const [open, setOpen] = useState(false);
  const popoverId = useId();
  const previewCopy =
    scope === 'payment'
      ? content.projectDetail.payments.preview
      : content.projectDetail.workflow.preview;
  const isActive = enabled;
  const isTapMode = interactionMode === 'tap';

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current != null) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const hide = useCallback(() => {
    clearHideTimer();
    setOpen(false);
  }, [clearHideTimer]);

  const show = useCallback(() => {
    if (!isActive) return;
    clearHideTimer();
    setOpen(true);
  }, [clearHideTimer, isActive]);

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

  const handleOpenDetails = useCallback(() => {
    hide();
    onOpenDetails?.();
  }, [hide, onOpenDetails]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') hide();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [hide, open]);

  const menu =
    isActive && open ? (
      <WorkflowInlineMenu
        open
        onClose={hide}
        anchorRef={anchorRef as RefObject<HTMLElement | null>}
        portalClassName={cardStyles.previewPortal}
        sizeToContent
        align="start"
        menuGapPx={6}
        disablePortalScroll
        portalHandlers={
          isTapMode
            ? undefined
            : {
                onMouseEnter: show,
                onMouseLeave: scheduleHide,
              }
        }
      >
        <WorkflowTaskPreviewCard
          task={task}
          scope={scope}
          customFieldDefinitions={customFieldDefinitions}
          stageLabel={stageLabel}
          documentCount={documentCount}
          showOpenDetails={showOpenDetails}
          onOpenDetails={handleOpenDetails}
          popoverId={popoverId}
        />
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

  const toggleButtonProps: WorkflowTaskPreviewToggleButtonProps | null =
    isActive && isTapMode
      ? {
          type: 'button',
          className: cardStyles.previewInfoBtn,
          'aria-expanded': open,
          'aria-haspopup': 'dialog',
          'aria-controls': popoverId,
          'aria-label': open
            ? previewCopy.hidePreviewAriaLabel
            : previewCopy.showPreviewAriaLabel(task.title),
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
