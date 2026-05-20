'use client';

import type { ReactElement } from 'react';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { useProjectDetailShell } from '@/presentation/features/crmProjectDetail/ProjectDetailShellContext';
import { useProjectProfitAndLossPdfExport } from '@/presentation/features/crmProjectDetail/useProjectProfitAndLossPdfExport';
import { BudgetTable } from './BudgetTable';
import { ProjectCostSummary } from './ProjectCostSummary';
import styles from './ProjectDetail.module.css';

export function ProjectFinancialsContent(): ReactElement {
  const { project, onRefresh, setToast } = useProjectDetailShell();
  const { exporting: exportingPl, exportPdf: exportProfitAndLossPdf } = useProjectProfitAndLossPdfExport(
    project,
    (message) => setToast({ kind: 'error', message })
  );

  const handleRefresh = async (): Promise<void> => {
    try {
      await onRefresh();
    } catch {
      setToast({ kind: 'error', message: content.projectDetail.saveError });
    }
  };

  return (
    <div className={styles.detailMiddle}>
      <BudgetTable
        project={project}
        onRefresh={handleRefresh}
        onError={(message) => setToast({ kind: 'error', message })}
      />
      <ProjectCostSummary
        budget={project.budget}
        generatingPl={exportingPl}
        onGeneratePl={() => void exportProfitAndLossPdf()}
      />
    </div>
  );
}
