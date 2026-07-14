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
export type WorkflowTaskPreviewTrigger = 'title' | 'icon';

export type UseWorkflowTaskPreviewPopoverOptions = {
  readonly task: CrmWorkflowTask;
  readonly scope: WorkflowTaskCustomFieldScope;
  readonly customFieldDefinitions: readonly WorkflowTaskCustomFieldDefinition[];
  readonly stageLabel?: string | null;
  readonly documentCount: number;
  readonly enabled?: boolean;
  readonly interactionMode?: WorkflowTaskPreviewInteractionMode;
  /** Hover: `'title'` hovers the name; `'icon'` uses a card icon before the name. Tap always uses the icon. */
  readonly previewTrigger?: WorkflowTaskPreviewTrigger;
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
  readonly onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  readonly onMouseEnter?: () => void;
  readonly onMouseLeave?: () => void;
  readonly onFocus?: () => void;
  readonly onBlur?: (event: FocusEvent<HTMLButtonElement>) => void;
};

export type WorkflowTaskPreviewPopoverAnchor = {
  readonly anchorRef: RefObject<HTMLElement | null>;
  readonly titleAnchorRef: RefObject<HTMLDivElement | null>;
  readonly iconAnchorRef: RefObject<HTMLButtonElement | null>;
  readonly anchorHandlers: {
    readonly onMouseEnter?: () => void;
    readonly onMouseLeave?: () => void;
    readonly onFocus?: () => void;
    readonly onBlur?: (event: FocusEvent<HTMLDivElement>) => void;
  };
  readonly toggleButtonProps: WorkflowTaskPreviewToggleButtonProps | null;
  readonly menuAlign: 'start' | 'end';
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
  previewTrigger = 'title',
  showOpenDetails = false,
  onOpenDetails,
}: UseWorkflowTaskPreviewPopoverOptions): WorkflowTaskPreviewPopoverAnchor {
  const titleAnchorRef = useRef<HTMLDivElement>(null);
  const iconAnchorRef = useRef<HTMLButtonElement>(null);
  const hideTimerRef = useRef<number | null>(null);
  const [open, setOpen] = useState(false);
  const popoverId = useId();
  const previewCopy =
    scope === 'payment'
      ? content.projectDetail.payments.preview
      : content.projectDetail.workflow.preview;
  const isActive = enabled;
  const isTapMode = interactionMode === 'tap';
  const useIconTrigger = isTapMode || previewTrigger === 'icon';
  const anchorRef = (useIconTrigger ? iconAnchorRef : titleAnchorRef) as RefObject<HTMLElement | null>;

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

  const isInsidePreview = useCallback(
    (node: Node | null) => {
      if (!(node instanceof Node)) return false;
      if (titleAnchorRef.current?.contains(node)) return true;
      if (iconAnchorRef.current?.contains(node)) return true;
      const popover = document.getElementById(popoverId);
      return popover?.contains(node) ?? false;
    },
    [popoverId]
  );

  const handleTitleBlur = useCallback(
    (event: FocusEvent<HTMLDivElement>) => {
      if (isTapMode || useIconTrigger) return;
      const next = event.relatedTarget;
      window.setTimeout(() => {
        if (isInsidePreview(document.activeElement)) return;
        if (isInsidePreview(next instanceof Node ? next : null)) return;
        setOpen(false);
      }, 0);
    },
    [isInsidePreview, isTapMode, useIconTrigger]
  );

  const handleIconBlur = useCallback(
    (event: FocusEvent<HTMLButtonElement>) => {
      if (isTapMode) return;
      const next = event.relatedTarget;
      window.setTimeout(() => {
        if (isInsidePreview(document.activeElement)) return;
        if (isInsidePreview(next instanceof Node ? next : null)) return;
        setOpen(false);
      }, 0);
    },
    [isInsidePreview, isTapMode]
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
        anchorRef={anchorRef}
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

  const titleHoverHandlers =
    !isTapMode && !useIconTrigger
      ? {
          onMouseEnter: show,
          onMouseLeave: scheduleHide,
          onFocus: show,
          onBlur: handleTitleBlur,
        }
      : {};

  const iconClassName = cardStyles.previewInfoBtn;

  const toggleButtonProps: WorkflowTaskPreviewToggleButtonProps | null =
    isActive && useIconTrigger
      ? {
          type: 'button',
          className: iconClassName,
          'aria-expanded': open,
          'aria-haspopup': 'dialog',
          'aria-controls': popoverId,
          'aria-label': open
            ? previewCopy.hidePreviewAriaLabel
            : previewCopy.showPreviewAriaLabel(task.title),
          ...(isTapMode
            ? { onClick: toggle }
            : {
                onMouseEnter: show,
                onMouseLeave: scheduleHide,
                onFocus: show,
                onBlur: handleIconBlur,
              }),
        }
      : null;

  return {
    anchorRef,
    titleAnchorRef,
    iconAnchorRef,
    anchorHandlers: titleHoverHandlers,
    toggleButtonProps,
    menuAlign: 'start' as const,
    open,
    menu,
  };
}
