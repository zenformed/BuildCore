'use client';

import type { ReactElement, ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import {
  LuCalculator,
  LuClipboardList,
  LuCreditCard,
  LuDollarSign,
  LuFolder,
  LuListTree,
  LuShield,
} from 'react-icons/lu';
import {
  buildProjectDetailFolderTabs,
  type ProjectDetailFolderTabId,
} from '@/presentation/features/crmProjectDetail/projectDetailFolderTabs';
import { useDashboardMobileLayout } from '@/presentation/features/crmProjects/useDashboardMobileLayout';
import { useProjectDetailShell } from '@/presentation/features/crmProjectDetail/ProjectDetailShellContext';
import { WorkflowTaskFileDragProvider } from '@/presentation/features/crmProjectDetail/workflowTaskFileDragContext';
import { useGuardedWorkflowTaskDocumentDrop } from '@/presentation/features/crmProjectDetail/useGuardedWorkflowTaskDocumentDrop';
import {
  FolderTabToolbarProvider,
  FolderTabToolbarSlot,
} from '@/presentation/features/crmProjectDetail/folderTabToolbarContext';
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
import { SubprojectsSection } from './SubprojectsSection';
import { WorkflowTasksTable } from './WorkflowTasksTable';
import styles from './ProjectDetail.module.css';

export type { ProjectDetailFolderTabId } from '@/presentation/features/crmProjectDetail/projectDetailFolderTabs';

type FolderTabIconTone =
  | 'subprojects'
  | 'workflow'
  | 'payments'
  | 'budget'
  | 'documents'
  | 'financials'
  | 'accountability';

const FOLDER_TAB_ICON_TONE_CLASS: Record<FolderTabIconTone, string> = {
  subprojects: styles.actionsMenuIconTile_subprojects,
  workflow: styles.actionsMenuIconTile_workflow,
  payments: styles.actionsMenuIconTile_payments,
  budget: styles.actionsMenuIconTile_budget,
  documents: styles.actionsMenuIconTile_documents,
  financials: styles.actionsMenuIconTile_financials,
  accountability: styles.actionsMenuIconTile_accountability,
};

function FolderTabIconTile({
  tone,
  children,
}: {
  readonly tone: FolderTabIconTone;
  readonly children: ReactNode;
}): ReactElement {
  return (
    <span
      className={[styles.actionsMenuIconTile, FOLDER_TAB_ICON_TONE_CLASS[tone], styles.folderTabIconTile].join(
        ' '
      )}
      aria-hidden
    >
      {children}
    </span>
  );
}

function FolderTabIcon({ tabId }: { readonly tabId: ProjectDetailFolderTabId }): ReactElement {
  const iconProps = { size: 12, strokeWidth: 2.4 } as const;
  switch (tabId) {
    case 'subprojects':
      return (
        <FolderTabIconTile tone="subprojects">
          <LuListTree {...iconProps} />
        </FolderTabIconTile>
      );
    case 'workflow':
      return (
        <FolderTabIconTile tone="workflow">
          <LuClipboardList {...iconProps} />
        </FolderTabIconTile>
      );
    case 'payments':
      return (
        <FolderTabIconTile tone="payments">
          <LuCreditCard {...iconProps} />
        </FolderTabIconTile>
      );
    case 'budget':
      return (
        <FolderTabIconTile tone="budget">
          <LuCalculator {...iconProps} />
        </FolderTabIconTile>
      );
    case 'documents':
      return (
        <FolderTabIconTile tone="documents">
          <LuFolder {...iconProps} />
        </FolderTabIconTile>
      );
    case 'financials':
      return (
        <FolderTabIconTile tone="financials">
          <LuDollarSign {...iconProps} />
        </FolderTabIconTile>
      );
    case 'accountability':
      return (
        <FolderTabIconTile tone="accountability">
          <LuShield {...iconProps} />
        </FolderTabIconTile>
      );
    default: {
      const _exhaustive: never = tabId;
      return _exhaustive;
    }
  }
}

function FolderTabBar({
  isMobileLayout,
  tabs,
  selectedTab,
  onSelectTab,
}: {
  readonly isMobileLayout: boolean;
  readonly tabs: ReturnType<typeof buildProjectDetailFolderTabs>;
  readonly selectedTab: ProjectDetailFolderTabId;
  readonly onSelectTab: (tab: ProjectDetailFolderTabId) => void;
}): ReactElement {
  return (
    <div
      className={[styles.folderTabBar, isMobileLayout ? styles.folderTabBar_mobile : '']
        .filter(Boolean)
        .join(' ')}
    >
      {isMobileLayout ? (
        <ProjectDetailFolderTabSelector
          tabs={tabs}
          selectedTab={selectedTab}
          onSelectTab={onSelectTab}
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
                onClick={() => onSelectTab(tab.id)}
              >
                <FolderTabIcon tabId={tab.id} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      )}
      <FolderTabToolbarSlot className={styles.folderTabActions} />
    </div>
  );
}

export function ProjectDetailFolderTabs(): ReactElement {
  const {
    project,
    subSlug,
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
  const showSubprojects = subSlug == null && project.summary.parentProjectId == null;
  const defaultTab: ProjectDetailFolderTabId = showSubprojects ? 'subprojects' : 'workflow';
  const [selectedTab, setSelectedTab] = useState<ProjectDetailFolderTabId>(defaultTab);
  const isReportsTabActive = selectedTab === 'financials';

  const tabs = useMemo(
    () =>
      buildProjectDetailFolderTabs({
        isMemberRole,
        showSubprojects,
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
      showSubprojects,
    ]
  );

  useEffect(() => {
    if (!tabs.some((tab) => tab.id === selectedTab)) {
      setSelectedTab(defaultTab);
    }
  }, [defaultTab, selectedTab, tabs]);

  const renderTabPanel = (): ReactElement => {
    switch (selectedTab) {
      case 'subprojects':
        return <SubprojectsSection embeddedInFolderTabs />;
      case 'workflow':
        return (
          <WorkflowTasksTable
            layout="full"
            project={project}
            isApiSource={isApiSource}
            embeddedInFolderTabs
            onTaskUpdated={handleWorkflowTaskPatched}
            onTaskAdded={handleWorkflowTaskCreated}
            onTaskError={(message) => setToast({ kind: 'error', message })}
            onRequestArchiveTask={setArchiveConfirmTask}
          />
        );
      case 'budget':
        return (
          <BudgetTable
            embeddedInFolderTabs
            onError={(message) => setToast({ kind: 'error', message })}
          />
        );
      case 'payments':
        return (
          <PaymentsRail
            project={project}
            isApiSource={isApiSource}
            embeddedInFolderTabs
            onTaskUpdated={handleWorkflowTaskPatched}
            onTaskCreated={handleWorkflowTaskCreated}
            onTaskError={(message) => setToast({ kind: 'error', message })}
            onRequestArchiveTask={setArchiveConfirmTask}
          />
        );
      case 'documents':
        return (
          <ProjectDocumentsTabPanel
            embeddedInFolderTabs
            onError={(message) => setToast({ kind: 'error', message })}
          />
        );
      case 'financials':
        return <ProjectFinancialsContent embeddedInFolderTabs />;
      case 'accountability':
        return <ProjectAccountabilityContent embeddedInFolderTabs />;
      default: {
        const _exhaustive: never = selectedTab;
        return _exhaustive;
      }
    }
  };

  return (
    <WorkflowTaskFileDragProvider onTaskDocumentDrop={guardedTaskDocumentDrop}>
      <FolderTabToolbarProvider>
        <div
          className={
            isReportsTabActive
              ? `${styles.folderTabsRoot} ${styles.folderTabsRootReportsActive}`
              : styles.folderTabsRoot
          }
        >
          <FolderTabBar
            isMobileLayout={isMobileLayout}
            tabs={tabs}
            selectedTab={selectedTab}
            onSelectTab={setSelectedTab}
          />
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
      </FolderTabToolbarProvider>
    </WorkflowTaskFileDragProvider>
  );
}
