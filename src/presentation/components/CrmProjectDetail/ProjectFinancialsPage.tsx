'use client';

import type { ReactElement } from 'react';
import { useProjectDetailShell } from '@/presentation/features/crmProjectDetail/ProjectDetailShellContext';
import { useProjectProfitAndLossPdfExport } from '@/presentation/features/crmProjectDetail/useProjectProfitAndLossPdfExport';
import { BudgetTable } from './BudgetTable';
import { ProjectCostSummary } from './ProjectCostSummary';
import styles from './ProjectDetail.module.css';

export function ProjectFinancialsContent(): ReactElement {
  const { project, setToast } = useProjectDetailShell();
  const { exporting: exportingPl, exportPdf: exportProfitAndLossPdf } = useProjectProfitAndLossPdfExport(
    project,
    (message) => setToast({ kind: 'error', message })
  );

  return (
    <div className={styles.detailMiddle}>
      <BudgetTable onError={(message) => setToast({ kind: 'error', message })} />
      <ProjectCostSummary
        budget={project.budget}
        generatingPl={exportingPl}
        onGeneratePl={() => void exportProfitAndLossPdf()}
      />
    </div>
  );
}
