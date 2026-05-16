'use client';

import type { ReactElement } from 'react';
import type { CrmPriority, CrmProjectSummary } from '@/domain/crm';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { formatStageLabel, formatTradeLabel } from '@/presentation/features/crmProjects/crmProjectFormatters';
import { BackIcon } from '@/platform/icons/buildCoreDashboardShellIcons';
import styles from './ProjectDetail.module.css';

function priorityClass(priority: CrmPriority): string {
  return styles[`priority_${priority}`] ?? styles.priority_normal;
}

export type ProjectDetailHeaderProps = {
  project: CrmProjectSummary;
  onBack: () => void;
};

export function ProjectDetailHeader({ project, onBack }: ProjectDetailHeaderProps): ReactElement {
  return (
    <div className={styles.topBar}>
      <button type="button" className={styles.backBtn} onClick={onBack}>
        <BackIcon />
        {content.projectDetail.backToProjects}
      </button>
      <div className={styles.titleBlock}>
        <h2 className={styles.title}>{project.name}</h2>
        <p className={styles.subtitle}>
          {project.client.name} · {formatTradeLabel(project.tradeType)}
        </p>
      </div>
      <div className={styles.pillRow}>
        <span className={priorityClass(project.priority)}>{project.priority}</span>
        <span className={styles.stagePill}>{formatStageLabel(project.currentStageSlug)}</span>
      </div>
    </div>
  );
}
