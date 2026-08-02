'use client';

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';

type FolderTabToolbarContextValue = {
  readonly slotEl: HTMLElement | null;
  readonly setSlotEl: (el: HTMLElement | null) => void;
};

const FolderTabToolbarContext = createContext<FolderTabToolbarContextValue | null>(null);

export function FolderTabToolbarProvider({
  children,
}: {
  readonly children: ReactNode;
}): ReactElement {
  const [slotEl, setSlotEl] = useState<HTMLElement | null>(null);
  const value = useMemo(
    () => ({
      slotEl,
      setSlotEl,
    }),
    [slotEl]
  );

  return (
    <FolderTabToolbarContext.Provider value={value}>{children}</FolderTabToolbarContext.Provider>
  );
}

export function FolderTabToolbarSlot({
  className,
}: {
  readonly className?: string;
}): ReactElement {
  const ctx = useContext(FolderTabToolbarContext);
  return (
    <div
      className={className}
      ref={(el) => {
        ctx?.setSlotEl(el);
      }}
    />
  );
}

/**
 * Renders toolbar actions into the shared folder tab bar via portal.
 * Returns null when outside FolderTabToolbarProvider (standalone pages).
 */
export function FolderTabToolbarPortal({
  children,
}: {
  readonly children: ReactNode;
}): ReactElement | null {
  const slotEl = useContext(FolderTabToolbarContext)?.slotEl ?? null;
  if (slotEl == null) return null;
  return createPortal(children, slotEl);
}
