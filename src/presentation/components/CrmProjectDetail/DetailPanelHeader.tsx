'use client';

import type { ReactElement, ReactNode } from 'react';
import styles from './ProjectDetail.module.css';

export type DetailPanelHeaderProps = {
  title: string;
  titleId?: string;
  children?: ReactNode;
};

export function DetailPanelHeader({
  title,
  titleId,
  children,
}: DetailPanelHeaderProps): ReactElement {
  return (
    <div className={styles.detailPanelHeader}>
      <h3 id={titleId} className={styles.detailPanelTitle}>
        {title}
      </h3>
      {children}
    </div>
  );
}
