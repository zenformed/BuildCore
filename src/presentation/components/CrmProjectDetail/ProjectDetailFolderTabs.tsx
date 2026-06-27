'use client';

import type { ReactElement } from 'react';
import { useEffect, useMemo, useState } from 'react';
import {
  buildProjectDetailFolderTabs,
  type ProjectDetailFolderTabId,
} from '@/presentation/features/crmProjectDetail/projectDetailFolderTabs';
import { useDashboardMobileLayout } from '@/presentation/features/crmProjects/useDashboardMobileLayout';
import { useProjectDetailShell } from '@/presentation/features/crmProjectDetail/ProjectDetailShellContext';
import { WorkflowTaskFileDragProvider } from '@/presentation/features/crmProjectDetail/workflowTaskFileDragContext';
import { useGuardedWorkflowTaskDocumentDrop } from '@/presentation/features/crmProjectDetail/useGuardedWorkflowTaskDocumentDrop';
import { useBuildCoreProjectSectionAccess } from '@/presentation/providers/BuildCoreProjectSectionAccessProvider';
import { BudgetTable } from './BudgetTable';
import { PaymentsRail } from './PaymentsRail';
import { ProjectAccountabilityContent } from './ProjectAccountabilityPage';
import { ProjectDocumentsTabPanel } from './ProjectDocumentsTabPanel';
import { ProjectFinancialsContent } from './ProjectFinancialsPage';
import {
  PROJECT_FOLDER_TAB_SELECT_LABEL_ID,
  ProjectDetailFolderTabSelector,
} from './ProjectDetailFolderTabSelector';
import { WorkflowTasksTable } from './WorkflowTasksTable';
import styles from './ProjectDetail.module.css';

export type { ProjectDetailFolderTabId } from '@/presentation/features/crmProjectDetail/projectDetailFolderTabs';

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
  } = useProjectDetailShell();
  const { payment, budget } = useBuildCoreProjectSectionAccess();
  const guardedTaskDocumentDrop = useGuardedWorkflowTaskDocumentDrop(
    handleTaskDocumentDrop,
    (message) => setToast({ kind: 'error', message })
  );
  const isMobileLayout = useDashboardMobileLayout();
  const [selectedTab, setSelectedTab] = useState<ProjectDetailFolderTabId>('workflow');
  const isReportsTabActive = selectedTab === 'financials';

  const tabs = useMemo(
    () =>
      buildProjectDetailFolderTabs({
        isMemberRole,
        paymentIsReady: payment.isReady,
        paymentCanView: payment.permissions.canView,
        budgetIsReady: budget.isReady,
        budgetCanView: budget.permissions.canView,
      }),
    [
      budget.isReady,
      budget.permissions.canView,
      isMemberRole,
      payment.isReady,
      payment.permissions.canView,
    ]
  );

  useEffect(() => {
    if (!tabs.some((tab) => tab.id === selectedTab)) {
      setSelectedTab('workflow');
    }
  }, [selectedTab, tabs]);

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
          <ProjectDocumentsTabPanel
            onError={(message) => setToast({ kind: 'error', message })}
          />
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
      <div
        className={
          isReportsTabActive
            ? `${styles.folderTabsRoot} ${styles.folderTabsRootReportsActive}`
            : styles.folderTabsRoot
        }
      >
        {isMobileLayout ? (
          <ProjectDetailFolderTabSelector
            tabs={tabs}
            selectedTab={selectedTab}
            onSelectTab={setSelectedTab}
          />
        ) : (
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
        )}
        <div
          id="project-folder-tabpanel"
          role="tabpanel"
          aria-labelledby={
            isMobileLayout
              ? PROJECT_FOLDER_TAB_SELECT_LABEL_ID
              : `project-folder-tab-${selectedTab}`
          }
          className={
            isReportsTabActive
              ? `${styles.folderTabPanel} ${styles.folderTabPanelReportsActive}`
              : styles.folderTabPanel
          }
        >
          <div
            className={
              isReportsTabActive
                ? `${styles.folderTabPanelInner} ${styles.folderTabPanelInnerReportsActive}`
                : styles.folderTabPanelInner
            }
          >
            {renderTabPanel()}
          </div>
        </div>
      </div>
    </WorkflowTaskFileDragProvider>
  );
}
