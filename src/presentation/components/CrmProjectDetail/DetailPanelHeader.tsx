'use client';

import type { ReactElement, ReactNode } from 'react';
import styles from './ProjectDetail.module.css';

export type DetailPanelHeaderProps = {
  title: string;
  titleId?: string;
  leading?: ReactNode;
  children?: ReactNode;
};

export function DetailPanelHeader({
  title,
  titleId,
  leading,
  children,
}: DetailPanelHeaderProps): ReactElement {
  return (
    <div className={styles.detailPanelHeader}>
      <div className={styles.detailPanelHeaderTitleGroup}>
        {leading}
        <h3 id={titleId} className={styles.detailPanelTitle}>
          {title}
        </h3>
      </div>
      {children}
    </div>
  );
}
