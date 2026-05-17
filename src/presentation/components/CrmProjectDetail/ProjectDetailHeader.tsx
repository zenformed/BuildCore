'use client';

import type { ReactElement } from 'react';
import type { CrmProjectSummary } from '@/domain/crm';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { getProjectTradeSubtitle } from '@/presentation/features/crmProjects/crmProjectFormatters';
import styles from './ProjectDetail.module.css';

export type ProjectDetailHeaderProps = {
  project: CrmProjectSummary;
  onBack: () => void;
  onEdit: () => void;
};

export function ProjectDetailHeader({ project, onBack, onEdit }: ProjectDetailHeaderProps): ReactElement {
  const detail = content.projectDetail;
  const tradeSubtitle = getProjectTradeSubtitle(project.tradeType);

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
          <h1 className={styles.title}>{project.name}</h1>
          {tradeSubtitle ? <p className={styles.subtitle}>{tradeSubtitle}</p> : null}
        </div>
      </div>
      <div className={styles.detailHeaderActions}>
        <button type="button" className={styles.editBtn} onClick={onEdit}>
          {detail.editProjectButton}
        </button>
        <button type="button" className={`${styles.editBtn} ${styles.actionsBtn}`} disabled aria-disabled="true">
          {detail.actionsButton}
        </button>
      </div>
    </header>
  );
}
