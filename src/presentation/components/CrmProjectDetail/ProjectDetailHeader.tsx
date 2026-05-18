'use client';

import type { ReactElement, ReactNode } from 'react';
import type { CrmProjectSummary } from '@/domain/crm';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import styles from './ProjectDetail.module.css';

export type ProjectDetailHeaderProps = {
  project: CrmProjectSummary;
  onBack: () => void;
  assigneeControl?: ReactNode;
  tradeTypeControl?: ReactNode;
};

export function ProjectDetailHeader({
  project,
  onBack,
  assigneeControl,
  tradeTypeControl,
}: ProjectDetailHeaderProps): ReactElement {
  const detail = content.projectDetail;

  return (
    <header className={styles.detailHeader}>
      <div className={styles.detailHeaderMain}>
        <div className={styles.titleBlock}>
          <nav className={styles.breadcrumb} aria-label="Breadcrumb">
            <span className={styles.breadcrumbMuted}>{detail.breadcrumbCrm}</span>
            <span className={styles.breadcrumbSep} aria-hidden>
              /
            </span>
            <button type="button" className={styles.breadcrumbLink} onClick={onBack}>
              {detail.breadcrumbProjects}
            </button>
            <span className={styles.breadcrumbSep} aria-hidden>
              /
            </span>
            <span className={styles.breadcrumbCurrent}>{project.name}</span>
          </nav>
          <div className={styles.titleRow}>
            <h1 className={styles.title}>{project.name}</h1>
            {assigneeControl}
          </div>
          {tradeTypeControl}
        </div>
      </div>
      <div className={styles.detailHeaderActions}>
        <button type="button" className={`${styles.editBtn} ${styles.actionsBtn}`} disabled aria-disabled="true">
          {detail.actionsButton}
        </button>
      </div>
    </header>
  );
}
