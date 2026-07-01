'use client';

import type { FocusEvent, MouseEvent, ReactElement, RefObject } from 'react';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { CrmProjectPreview } from '@/domain/crm/projectPreview';
import type { ProjectCustomFieldDefinition } from '@/domain/buildcore/projectCustomFields';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { fetchCrmProjectPreview } from '@/presentation/features/crmProjects/fetchCrmProjectPreview';
import { WorkflowInlineMenu } from '../CrmProjectDetail/WorkflowInlineMenu';
import { ProjectPreviewCard } from './ProjectPreviewCard';
import cardStyles from '../CrmProjectDetail/WorkflowTaskPreviewCard.module.css';

const HIDE_DELAY_MS = 200;

export type ProjectPreviewInteractionMode = 'hover' | 'tap';

export type UseProjectPreviewPopoverOptions = {
  readonly projectSlug: string;
  readonly projectName: string;
  readonly customFieldDefinitions: readonly ProjectCustomFieldDefinition[];
  readonly stageLabel?: string | null;
  readonly progressPercent?: number | null;
  readonly enabled?: boolean;
  readonly interactionMode?: ProjectPreviewInteractionMode;
};

export type ProjectPreviewToggleButtonProps = {
  readonly type: 'button';
  readonly className: string;
  readonly 'aria-expanded': boolean;
  readonly 'aria-haspopup': 'dialog';
  readonly 'aria-controls': string;
  readonly 'aria-label': string;
  readonly onClick: (event: MouseEvent<HTMLButtonElement>) => void;
};

export type ProjectPreviewPopoverAnchor = {
  readonly anchorRef: RefObject<HTMLDivElement | null>;
  readonly anchorHandlers: {
    readonly onMouseEnter?: () => void;
    readonly onMouseLeave?: () => void;
    readonly onFocus?: () => void;
    readonly onBlur?: (event: FocusEvent<HTMLDivElement>) => void;
  };
  readonly toggleButtonProps: ProjectPreviewToggleButtonProps | null;
  readonly open: boolean;
  readonly menu: ReactElement | null;
};

export function useProjectPreviewPopover({
  projectSlug,
  projectName,
  customFieldDefinitions,
  stageLabel,
  progressPercent,
  enabled = true,
  interactionMode = 'hover',
}: UseProjectPreviewPopoverOptions): ProjectPreviewPopoverAnchor {
  const anchorRef = useRef<HTMLDivElement>(null);
  const hideTimerRef = useRef<number | null>(null);
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<CrmProjectPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const popoverId = useId();
  const previewCopy = content.crm.projectPreview;
  const isActive = enabled;
  const isTapMode = interactionMode === 'tap';

  const loadPreview = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const next = await fetchCrmProjectPreview(projectSlug);
      if (next == null) {
        setLoadError(previewCopy.loadFailed);
        setPreview(null);
      } else {
        setPreview(next);
      }
    } catch {
      setLoadError(previewCopy.loadFailed);
      setPreview(null);
    } finally {
      setLoading(false);
    }
  }, [previewCopy.loadFailed, projectSlug]);

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

  useEffect(() => {
    if (!open) return;
    void loadPreview();
  }, [loadPreview, open]);

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
        <ProjectPreviewCard
          preview={preview}
          loading={loading}
          loadError={loadError}
          customFieldDefinitions={customFieldDefinitions}
          stageLabel={stageLabel}
          progressPercent={progressPercent}
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

  const toggleButtonProps: ProjectPreviewToggleButtonProps | null =
    isActive && isTapMode
      ? {
          type: 'button',
          className: cardStyles.previewInfoBtn,
          'aria-expanded': open,
          'aria-haspopup': 'dialog',
          'aria-controls': popoverId,
          'aria-label': open
            ? previewCopy.hidePreviewAriaLabel
            : previewCopy.showPreviewAriaLabel(projectName),
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
