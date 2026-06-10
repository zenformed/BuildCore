'use client';

import type { ReactElement } from 'react';
import { useProjectDetailShell } from '@/presentation/features/crmProjectDetail/ProjectDetailShellContext';
import { ProjectFinancialReportContent } from './ProjectFinancialReportContent';
import styles from './ProjectDetail.module.css';

export function ProjectFinancialsContent(): ReactElement {
  const { project, onRefresh, setToast } = useProjectDetailShell();

  return (
    <div className={styles.detailFinancialsRowSingle}>
      <ProjectFinancialReportContent
        project={project}
        onRefresh={onRefresh}
        onRefreshError={(message) => setToast({ kind: 'error', message })}
        onError={(message) => setToast({ kind: 'error', message })}
      />
    </div>
  );
}
