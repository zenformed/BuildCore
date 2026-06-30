'use client';

import type { ReactElement, ReactNode } from 'react';
import styles from './BuildCoreHoverTooltip.module.css';

export type BuildCoreHoverTooltipProps = {
  readonly label: string;
  readonly children: ReactNode;
  readonly className?: string;
  readonly tooltipId?: string;
};

export function BuildCoreHoverTooltip({
  label,
  children,
  className,
  tooltipId,
}: BuildCoreHoverTooltipProps): ReactElement {
  const wrapClass = [styles.wrap, className].filter(Boolean).join(' ');

  return (
    <span className={wrapClass}>
      {children}
      <span id={tooltipId} role="tooltip" className={styles.tooltip}>
        {label}
      </span>
    </span>
  );
}
