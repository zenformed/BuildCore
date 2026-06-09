'use client';

import type { ReactElement, ReactNode } from 'react';
import styles from './ProjectDetail.module.css';

export type DetailPanelHeaderActionsProps = {
  readonly children: ReactNode;
};

export function DetailPanelHeaderActions({
  children,
}: DetailPanelHeaderActionsProps): ReactElement {
  return <div className={styles.detailPanelHeaderActions}>{children}</div>;
}
