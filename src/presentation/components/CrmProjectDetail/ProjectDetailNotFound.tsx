'use client';

import type { ReactElement } from 'react';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { BackIcon } from '@/platform/icons/buildCoreDashboardShellIcons';
import styles from './ProjectDetail.module.css';

export type ProjectDetailNotFoundProps = {
  onBack: () => void;
};

export function ProjectDetailNotFound({ onBack }: ProjectDetailNotFoundProps): ReactElement {
  return (
    <div className={styles.notFound}>
      <h2>{content.projectDetail.notFound.title}</h2>
      <p>{content.projectDetail.notFound.message}</p>
      <button type="button" className={styles.backBtn} onClick={onBack}>
        <BackIcon />
        {content.projectDetail.notFound.back}
      </button>
    </div>
  );
}
