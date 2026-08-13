'use client';

import type { ReactElement, ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  LuCalculator,
  LuClipboardList,
  LuCreditCard,
  LuDollarSign,
  LuFolder,
  LuListTree,
  LuShield,
} from 'react-icons/lu';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
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

function FolderTabMobileIcon({
  tabId,
}: {
  readonly tabId: ProjectDetailFolderTabId;
}): ReactElement {
  const iconProps = { size: 18, strokeWidth: 2 } as const;
  switch (tabId) {
    case 'subprojects':
      return <LuListTree {...iconProps} />;
    case 'workflow':
      return <LuClipboardList {...iconProps} />;
    case 'payments':
      return <LuCreditCard {...iconProps} />;
    case 'budget':
      return <LuCalculator {...iconProps} />;
    case 'documents':
      return <LuFolder {...iconProps} />;
    case 'financials':
      return <LuDollarSign {...iconProps} />;
    case 'accountability':
      return <LuShield {...iconProps} />;
    default: {
      const _exhaustive: never = tabId;
      return _exhaustive;
    }
  }
}

const MOBILE_FOOTER_LABELS: Partial<Record<ProjectDetailFolderTabId, string>> = {
  subprojects: 'Leads',
  workflow: 'Tasks',
  payments: 'Payments',
  budget: 'Budget',
  documents: 'Docs',
  financials: 'Reports',
};

function FolderTabBar({
  isMobileLayout,
  tabs,
  mobileFooterTabs,
  selectedTab,
  onSelectTab,
}: {
  readonly isMobileLayout: boolean;
  readonly tabs: ReturnType<typeof buildProjectDetailFolderTabs>;
  readonly mobileFooterTabs: ReturnType<typeof buildProjectDetailFolderTabs>;
  readonly selectedTab: ProjectDetailFolderTabId;
  readonly onSelectTab: (tab: ProjectDetailFolderTabId) => void;
}): ReactElement {
  return (
    <div
      className={[styles.folderTabBar, isMobileLayout ? styles.folderTabBar_mobile : '']
        .filter(Boolean)
        .join(' ')}
    >
      {isMobileLayout ? null : (
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
      {isMobileLayout ? (
        <nav className={styles.folderTabMobileFooter} role="tablist" aria-label="Project sections">
          {mobileFooterTabs.map((tab) => {
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
                className={isActive ? styles.folderTabMobileFooterBtnActive : styles.folderTabMobileFooterBtn}
                onClick={() => onSelectTab(tab.id)}
                title={tab.label}
                aria-label={tab.label}
              >
                <FolderTabMobileIcon tabId={tab.id} />
                <span className={styles.folderTabMobileFooterLabel}>
                  {MOBILE_FOOTER_LABELS[tab.id] ?? tab.label}
                </span>
              </button>
            );
          })}
        </nav>
      ) : null}
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
  const [mobileShellBar, setMobileShellBar] = useState<HTMLElement | null>(null);
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

  const mobileFooterTabs = useMemo(
    () => tabs.filter((tab) => tab.id !== 'accountability'),
    [tabs]
  );

  useEffect(() => {
    if (!isMobileLayout || selectedTab !== 'accountability') return;
    if (mobileFooterTabs.length === 0) return;
    setSelectedTab(mobileFooterTabs[0]?.id ?? defaultTab);
  }, [defaultTab, isMobileLayout, mobileFooterTabs, selectedTab]);

  useEffect(() => {
    if (!isMobileLayout) {
      setMobileShellBar(null);
      return;
    }
    const menuButton = document.querySelector<HTMLButtonElement>(
      'button[aria-controls="zenformed-mobile-drawer"]'
    );
    setMobileShellBar(menuButton?.parentElement ?? null);
  }, [isMobileLayout]);

  const selectedTabLabel =
    tabs.find((tab) => tab.id === selectedTab)?.label ?? content.projectDetail.folderTabs.sectionsLabel;
  const mobileShellSectionTitle =
    isMobileLayout && mobileShellBar != null
      ? createPortal(
          <div className={styles.projectDetailMobileShellSectionTitle}>{selectedTabLabel}</div>,
          mobileShellBar
        )
      : null;

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
            mobileFooterTabs={mobileFooterTabs}
            selectedTab={selectedTab}
            onSelectTab={setSelectedTab}
          />
          <div
            id="project-folder-tabpanel"
            role="tabpanel"
            aria-labelledby={`project-folder-tab-${selectedTab}`}
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
        {mobileShellSectionTitle}
      </FolderTabToolbarProvider>
    </WorkflowTaskFileDragProvider>
  );
}
