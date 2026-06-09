'use client';

import type { ReactElement } from 'react';
import {
  BsCheckCircle,
  BsCheckLg,
  BsCircleFill,
  BsExclamationCircle,
  BsExclamationLg,
  BsXLg,
} from 'react-icons/bs';
import styles from './crmShared.module.css';

export type CrmProjectStatusCircleIconKind = 'priority' | 'complete' | 'incomplete';

export type CrmProjectStatusCircleIconProps = {
  readonly kind: CrmProjectStatusCircleIconKind;
  readonly active: boolean;
  readonly size?: number;
  readonly className?: string;
};

function ActiveStatusCircleIcon({
  kind,
  size,
  circleClassName,
}: {
  kind: Exclude<CrmProjectStatusCircleIconKind, 'incomplete'>;
  size: number;
  circleClassName: string;
}): ReactElement {
  const symbolSize = Math.max(12, Math.round(size * 0.85));
  const Symbol = kind === 'priority' ? BsExclamationLg : BsCheckLg;

  return (
    <span
      className={styles.statusCircleIconStack}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <BsCircleFill className={circleClassName} size={size} />
      <Symbol className={styles.statusCircleIconSymbol} size={symbolSize} />
    </span>
  );
}

export function CrmProjectStatusCircleIcon({
  kind,
  active,
  size = 16,
  className,
}: CrmProjectStatusCircleIconProps): ReactElement {
  if (kind === 'incomplete') {
    const symbolSize = Math.max(9, Math.round(size * 0.72));
    return (
      <span
        className={styles.statusCircleIconStack}
        style={{ width: size, height: size }}
        aria-hidden
      >
        <BsCircleFill className={styles.statusCircleIcon_incomplete} size={size} />
        <BsXLg className={styles.statusCircleIconSymbol} size={symbolSize} />
      </span>
    );
  }

  const circleClassName = [
    styles.statusCircleIcon,
    kind === 'priority'
      ? active
        ? styles.statusCircleIcon_priorityActive
        : styles.statusCircleIcon_priorityInactive
      : active
        ? styles.statusCircleIcon_completeActive
        : styles.statusCircleIcon_completeInactive,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  if (active) {
    return <ActiveStatusCircleIcon kind={kind} size={size} circleClassName={circleClassName} />;
  }

  const Icon = kind === 'priority' ? BsExclamationCircle : BsCheckCircle;
  return <Icon className={circleClassName} size={size} aria-hidden />;
}
