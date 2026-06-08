'use client';

import type { CSSProperties, ReactElement, ReactNode, RefObject } from 'react';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './ProjectDetail.module.css';

function useWorkflowInlineMenuDismiss(
  anchorRef: RefObject<HTMLElement | null>,
  menuRef: RefObject<HTMLElement | null>,
  open: boolean,
  onClose: () => void
): void {
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (anchorRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      onClose();
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [anchorRef, menuRef, open, onClose]);
}

type MenuPosition = {
  top: number;
  left: number;
  minWidth: number;
};

const MENU_GAP_PX = 4;
const VIEWPORT_PADDING_PX = 8;

function computeMenuPosition(
  anchor: HTMLElement,
  menu: HTMLElement | null,
  align: 'start' | 'end',
  sizeToContent: boolean
): MenuPosition {
  const rect = anchor.getBoundingClientRect();
  const minWidth = sizeToContent ? 0 : Math.max(rect.width, 136);
  const menuHeight = menu?.offsetHeight ?? 0;
  const menuWidth = menu?.offsetWidth ?? minWidth;

  let top = rect.bottom + MENU_GAP_PX;
  const spaceBelow = window.innerHeight - rect.bottom - MENU_GAP_PX;
  const spaceAbove = rect.top - MENU_GAP_PX;

  if (menuHeight > 0) {
    if (menuHeight > spaceBelow && spaceAbove >= spaceBelow) {
      top = rect.top - menuHeight - MENU_GAP_PX;
    }

    const maxTop = window.innerHeight - menuHeight - VIEWPORT_PADDING_PX;
    top = Math.max(VIEWPORT_PADDING_PX, Math.min(top, maxTop));
  } else if (spaceBelow < 160 && spaceAbove > spaceBelow) {
    top = Math.max(VIEWPORT_PADDING_PX, rect.top - 160 - MENU_GAP_PX);
  }

  let left = align === 'end' ? rect.right : rect.left;

  if (menuWidth > 0) {
    if (align === 'end') {
      if (left - menuWidth < VIEWPORT_PADDING_PX) {
        left = Math.min(rect.right, window.innerWidth - VIEWPORT_PADDING_PX);
      }
    } else if (left + menuWidth > window.innerWidth - VIEWPORT_PADDING_PX) {
      left = Math.max(VIEWPORT_PADDING_PX, window.innerWidth - menuWidth - VIEWPORT_PADDING_PX);
    }
  }

  return { top, left, minWidth };
}

export type WorkflowInlineMenuProps = {
  open: boolean;
  onClose: () => void;
  anchorRef: RefObject<HTMLElement | null>;
  children: ReactNode;
  align?: 'start' | 'end';
  /** Portal panel class; defaults to inline table menu styling. */
  portalClassName?: string;
  /** Size dropdown to fit labels instead of anchoring to trigger width. */
  sizeToContent?: boolean;
};

export function WorkflowInlineMenu({
  open,
  onClose,
  anchorRef,
  children,
  align = 'start',
  portalClassName,
  sizeToContent = false,
}: WorkflowInlineMenuProps): ReactElement | null {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<MenuPosition | null>(null);

  const updatePosition = useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    setPosition(computeMenuPosition(anchor, menuRef.current, align, sizeToContent));
  }, [align, anchorRef, sizeToContent]);

  useLayoutEffect(() => {
    if (!open) {
      setPosition(null);
      return;
    }
    updatePosition();
    const frame = requestAnimationFrame(() => updatePosition());
    return () => cancelAnimationFrame(frame);
  }, [open, updatePosition, children]);

  useEffect(() => {
    if (!open) return;
    const onReposition = () => updatePosition();
    window.addEventListener('resize', onReposition);
    window.addEventListener('scroll', onReposition, true);
    return () => {
      window.removeEventListener('resize', onReposition);
      window.removeEventListener('scroll', onReposition, true);
    };
  }, [open, updatePosition]);

  useWorkflowInlineMenuDismiss(anchorRef, menuRef, open, onClose);

  if (!open || position == null || typeof document === 'undefined') return null;

  const menuStyle: CSSProperties = {
    top: position.top,
    left: position.left,
    ...(sizeToContent ? {} : { minWidth: position.minWidth }),
    transform: align === 'end' ? 'translateX(-100%)' : undefined,
  };

  return createPortal(
    <div
      ref={menuRef}
      className={portalClassName ?? styles.inlineMenu_portal}
      style={menuStyle}
      role="menu"
    >
      {children}
    </div>,
    document.body
  );
}
