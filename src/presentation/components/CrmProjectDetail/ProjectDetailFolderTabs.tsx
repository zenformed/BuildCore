'use client';

import type { ReactElement } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { useProjectDetailShell } from '@/presentation/features/crmProjectDetail/ProjectDetailShellContext';
import { WorkflowTaskFileDragProvider } from '@/presentation/features/crmProjectDetail/workflowTaskFileDragContext';
import { useGuardedWorkflowTaskDocumentDrop } from '@/presentation/features/crmProjectDetail/useGuardedWorkflowTaskDocumentDrop';
import { useBuildCoreProjectSectionAccess } from '@/presentation/providers/BuildCoreProjectSectionAccessProvider';
import { BudgetTable } from './BudgetTable';
import { DetailPanelHeader } from './DetailPanelHeader';
import { PaymentsRail } from './PaymentsRail';
import { ProjectAccountabilityContent } from './ProjectAccountabilityPage';
import { ProjectDocumentsPanelContent } from './ProjectDocumentsPanelContent';
import { ProjectFinancialsContent } from './ProjectFinancialsPage';
import { WorkflowTasksTable } from './WorkflowTasksTable';
import styles from './ProjectDetail.module.css';

export type ProjectDetailFolderTabId =
  | 'workflow'
  | 'budget'
  | 'payments'
  | 'documents'
  | 'financials'
  | 'accountability';

type FolderTabDef = {
  readonly id: ProjectDetailFolderTabId;
  readonly label: string;
};

export function ProjectDetailFolderTabs(): ReactElement {
  const {
    project,
    isApiSource,
    isMemberRole,
    handleWorkflowTaskPatched,
    handleWorkflowTaskCreated,
    handleTaskDocumentDrop,
    setArchiveConfirmTask,
    setToast,
    onRefresh,
  } = useProjectDetailShell();
  const { payment, budget } = useBuildCoreProjectSectionAccess();
  const guardedTaskDocumentDrop = useGuardedWorkflowTaskDocumentDrop(
    handleTaskDocumentDrop,
    (message) => setToast({ kind: 'error', message })
  );
  const [selectedTab, setSelectedTab] = useState<ProjectDetailFolderTabId>('workflow');

  const tabs = useMemo((): readonly FolderTabDef[] => {
    const detail = content.projectDetail;
    const items: FolderTabDef[] = [
      { id: 'workflow', label: detail.actions.workflowTasks },
    ];

    if (budget.isReady && budget.permissions.canView) {
      items.push({ id: 'budget', label: detail.budget.tableTitle });
    }
    if (payment.isReady && payment.permissions.canView) {
      items.push({ id: 'payments', label: detail.payments.title });
    }
    if (!isMemberRole) {
      items.push({ id: 'documents', label: detail.sections.documents });
      items.push({ id: 'financials', label: 'Reports' });
      items.push({ id: 'accountability', label: detail.actions.accountability });
    }

    return items;
  }, [
    budget.isReady,
    budget.permissions.canView,
    isMemberRole,
    payment.isReady,
    payment.permissions.canView,
  ]);

  useEffect(() => {
    if (!tabs.some((tab) => tab.id === selectedTab)) {
      setSelectedTab('workflow');
    }
  }, [selectedTab, tabs]);

  const handleDocumentsRefresh = async (): Promise<void> => {
    try {
      await onRefresh();
    } catch {
      setToast({ kind: 'error', message: content.projectDetail.saveError });
    }
  };

  const renderTabPanel = (): ReactElement => {
    switch (selectedTab) {
      case 'workflow':
        return (
          <WorkflowTasksTable
            layout="full"
            project={project}
            isApiSource={isApiSource}
            onTaskUpdated={handleWorkflowTaskPatched}
            onTaskAdded={handleWorkflowTaskCreated}
            onTaskError={(message) => setToast({ kind: 'error', message })}
            onRequestArchiveTask={setArchiveConfirmTask}
          />
        );
      case 'budget':
        return <BudgetTable onError={(message) => setToast({ kind: 'error', message })} />;
      case 'payments':
        return (
          <PaymentsRail
            project={project}
            isApiSource={isApiSource}
            onTaskUpdated={handleWorkflowTaskPatched}
            onTaskCreated={handleWorkflowTaskCreated}
            onTaskError={(message) => setToast({ kind: 'error', message })}
            onRequestArchiveTask={setArchiveConfirmTask}
          />
        );
      case 'documents':
        return (
          <section
            className={`${styles.paymentsPanel} ${styles.documentsTabPanel}`}
            aria-labelledby="project-documents-tab-heading"
          >
            <DetailPanelHeader
              title={content.projectDetail.sections.documents}
              titleId="project-documents-tab-heading"
            />
            <ProjectDocumentsPanelContent
              project={project}
              onRefresh={handleDocumentsRefresh}
              onError={(message) => setToast({ kind: 'error', message })}
            />
          </section>
        );
      case 'financials':
        return <ProjectFinancialsContent />;
      case 'accountability':
        return <ProjectAccountabilityContent />;
      default: {
        const _exhaustive: never = selectedTab;
        return _exhaustive;
      }
    }
  };

  return (
    <WorkflowTaskFileDragProvider onTaskDocumentDrop={guardedTaskDocumentDrop}>
      <div className={styles.folderTabsRoot}>
        <div className={styles.folderTabList} role="tablist" aria-label="Project sections">
          {tabs.map((tab) => {
            const isActive = tab.id === selectedTab;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                id={`project-folder-tab-${tab.id}`}
                aria-selected={isActive}
                aria-controls="project-folder-tabpanel"
                tabIndex={isActive ? 0 : -1}
                className={isActive ? styles.folderTabActive : styles.folderTab}
                onClick={() => setSelectedTab(tab.id)}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
        <div
          id="project-folder-tabpanel"
          role="tabpanel"
          aria-labelledby={`project-folder-tab-${selectedTab}`}
          className={styles.folderTabPanel}
        >
          <div className={styles.folderTabPanelInner}>{renderTabPanel()}</div>
        </div>
      </div>
    </WorkflowTaskFileDragProvider>
  );
}
