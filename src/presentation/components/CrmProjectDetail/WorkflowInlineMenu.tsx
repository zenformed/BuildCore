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

export type WorkflowInlineMenuProps = {
  open: boolean;
  onClose: () => void;
  anchorRef: RefObject<HTMLElement | null>;
  children: ReactNode;
  align?: 'start' | 'end';
  /** Portal panel class; defaults to inline table menu styling. */
  portalClassName?: string;
};

export function WorkflowInlineMenu({
  open,
  onClose,
  anchorRef,
  children,
  align = 'start',
  portalClassName,
}: WorkflowInlineMenuProps): ReactElement | null {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<MenuPosition | null>(null);

  const updatePosition = useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    setPosition({
      top: rect.bottom + 4,
      left: align === 'end' ? rect.right : rect.left,
      minWidth: Math.max(rect.width, 136),
    });
  }, [align, anchorRef]);

  useLayoutEffect(() => {
    if (!open) {
      setPosition(null);
      return;
    }
    updatePosition();
  }, [open, updatePosition]);

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
    minWidth: position.minWidth,
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
