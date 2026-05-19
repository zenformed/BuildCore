'use client';

import type { ReactElement } from 'react';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { useProjectDetailWorkspace } from '@/presentation/features/crmProjectDetail/useProjectDetailWorkspace';
import { BudgetTable } from './BudgetTable';
import { DetailToast } from './DetailToast';
import { useProjectProfitAndLossPdfExport } from '@/presentation/features/crmProjectDetail/useProjectProfitAndLossPdfExport';
import { ProjectCostSummary } from './ProjectCostSummary';
import { ProjectDetailActionsMenu } from './ProjectDetailActionsMenu';
import { ProjectDetailContextBlock } from './ProjectDetailContextBlock';
import type { ProjectDetailPageProps } from './ProjectDetailPage';
import styles from './ProjectDetail.module.css';

export type ProjectFinancialsPageProps = Pick<
  ProjectDetailPageProps,
  'project' | 'isApiSource' | 'onBack' | 'onRefresh'
> & {
  onOpenProject: () => void;
};

export function ProjectFinancialsPage({
  project: initialProject,
  isApiSource,
  onBack,
  onOpenProject,
  onRefresh,
}: ProjectFinancialsPageProps): ReactElement {
  const workspace = useProjectDetailWorkspace(initialProject, onRefresh);
  const { project, toast, setToast, savingField, patchField } = workspace;
  const { exporting: exportingPl, exportPdf: exportProfitAndLossPdf } = useProjectProfitAndLossPdfExport(
    project,
    (message) => setToast({ kind: 'error', message })
  );

  const handleRefresh = async () => {
    try {
      await onRefresh();
    } catch {
      setToast({ kind: 'error', message: content.projectDetail.saveError });
    }
  };

  return (
    <div className={styles.pageTasks} data-project-financials-page>
      {toast ? <DetailToast kind={toast.kind} message={toast.message} onDismiss={() => setToast(null)} /> : null}

      <ProjectDetailContextBlock
        project={project}
        isApiSource={isApiSource}
        pageContext="financials"
        onBack={onBack}
        onOpenProject={onOpenProject}
        actions={<ProjectDetailActionsMenu projectSlug={project.summary.slug} />}
        savingField={savingField}
        patchField={patchField}
      />

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
    </div>
  );
}
