'use client';

import type { KeyboardEvent, ReactElement, ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CrmProjectDetail, PipelineStageSlug, CrmDocumentMetadata } from '@/domain/crm';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { formatWorkflowTaskStageLabel } from '@/presentation/features/crmProjectDetail/crmProjectDetailFormatters';
import {
  buildDocumentPanelSourcesFromProject,
  filterDocumentPanelItems,
  type DocumentListItem,
  type DocumentPanelFilter,
} from '@/presentation/features/crmProjectDetail/documentPanelModel';
import { formatBudgetCategory } from '@/presentation/features/crmProjectDetail/budgetCategoryLabels';
import { useBuildCorePipelineStages } from '@/presentation/providers/BuildCorePipelineStagesProvider';
import { useBuildCoreWorkflowTaskAccess } from '@/presentation/providers/BuildCoreWorkflowTaskAccessProvider';
import { useBuildCoreProjectSectionAccess } from '@/presentation/providers/BuildCoreProjectSectionAccessProvider';
import { resolveCrmDocumentDownloadPermissionDomain } from '@/presentation/features/crmProjectDetail/crmDocumentDownloadPermission';
import { filterDocumentPanelItemsBySearch } from '@/presentation/features/crmProjectDetail/projectSectionSearchModel';
import {
  formatDocumentKind,
  formatFileSize,
  formatShortDate,
} from '@/presentation/features/crmProjectDetail/crmProjectDetailFormatters';
import { useProjectDocumentModalActions } from '@/presentation/features/crmProjectDetail/useProjectDocumentModalActions';
import { useDocumentRowSelection } from '@/presentation/features/crmProjectDetail/documentRowSelectionContext';
import { useProjectDetailShell } from '@/presentation/features/crmProjectDetail/ProjectDetailShellContext';
import { useDashboardMobileLayout } from '@/presentation/features/crmProjects/useDashboardMobileLayout';
import { DocumentsListHeaderRow } from './DocumentsListHeaderRow';
import { WorkflowDocumentFileIcon } from './WorkflowDocumentFileIcon';
import styles from './ProjectDetail.module.css';

export type ProjectDocumentsPanelContentProps = {
  project: CrmProjectDetail;
  filter: DocumentPanelFilter;
  searchQuery?: string;
  /**
   * When provided (Documents list v2), render these items instead of deriving
   * from embedded project.documents.
   */
  itemsOverride?: readonly DocumentListItem[];
  /** Desktop: filter caret shown in the list header (workflow/budget pattern). */
  leadingFilter?: ReactNode;
  onRefresh: () => Promise<void>;
  onError?: (message: string) => void;
  /** When false, hide the inline status refresh (e.g. moved to folder tab bar). */
  showStatusRefresh?: boolean;
};

type DocumentListFileRowProps = {
  readonly doc: CrmDocumentMetadata;
  readonly isMobileLayout: boolean;
  readonly isSelected: boolean;
  readonly showRowSelect: boolean;
  readonly metadataText: string;
  readonly isBusy: boolean;
  readonly canDownload: boolean;
  readonly selectItemAriaLabel?: string;
  readonly onToggleSelection?: () => void;
  readonly onDownload?: () => void;
  readonly onDelete: () => void;
  readonly downloadTitle: string;
  readonly deleteTitle: string;
};

function DocumentListFileRow({
  doc,
  isMobileLayout,
  isSelected,
  showRowSelect,
  metadataText,
  isBusy,
  canDownload,
  selectItemAriaLabel,
  onToggleSelection,
  onDownload,
  onDelete,
  downloadTitle,
  deleteTitle,
}: DocumentListFileRowProps): ReactElement {
  const selectionModeActive = Boolean(onToggleSelection) && isMobileLayout && showRowSelect;
  const longPressTimerRef = useRef<number | null>(null);
  const longPressTriggeredRef = useRef(false);

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimerRef.current != null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  useEffect(
    () => () => {
      if (longPressTimerRef.current != null) {
        window.clearTimeout(longPressTimerRef.current);
      }
    },
    []
  );

  const handleTouchStart = useCallback(() => {
    if (!isMobileLayout || onToggleSelection == null || selectionModeActive) return;
    longPressTriggeredRef.current = false;
    clearLongPressTimer();
    longPressTimerRef.current = window.setTimeout(() => {
      onToggleSelection();
      longPressTriggeredRef.current = true;
    }, 420);
  }, [clearLongPressTimer, isMobileLayout, onToggleSelection, selectionModeActive]);

  const handleCardActivate = useCallback(() => {
    if (onToggleSelection == null) return;
    if (longPressTriggeredRef.current) {
      longPressTriggeredRef.current = false;
      return;
    }
    if (selectionModeActive) onToggleSelection();
  }, [onToggleSelection, selectionModeActive]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLLIElement>): void => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      if (!selectionModeActive || onToggleSelection == null) return;
      event.preventDefault();
      onToggleSelection();
    },
    [onToggleSelection, selectionModeActive]
  );

  return (
    <li
      className={[
        styles.docListItem,
        styles.docListItem_hasFile,
        selectionModeActive ? styles.subprojectMobileCard_selectionMode : '',
        isSelected ? styles.docListItem_selected : '',
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={handleCardActivate}
      onKeyDown={handleKeyDown}
      onTouchStart={handleTouchStart}
      onTouchEnd={clearLongPressTimer}
      onTouchCancel={clearLongPressTimer}
      onTouchMove={clearLongPressTimer}
      tabIndex={selectionModeActive ? 0 : -1}
    >
      {showRowSelect && onToggleSelection != null ? (
        <span className={styles.docListItemSelect}>
          <button
            type="button"
            className={[
              styles.workflowTaskMobileCardSelectToggle,
              showRowSelect ? styles.workflowTaskMobileCardSelectToggle_visible : '',
              isSelected ? styles.workflowTaskMobileCardSelectToggle_checked : '',
            ]
              .filter(Boolean)
              .join(' ')}
            aria-label={selectItemAriaLabel ?? doc.name}
            aria-pressed={isSelected}
            onClick={(event) => {
              event.stopPropagation();
              onToggleSelection();
            }}
          >
            <span className={styles.workflowTaskMobileCardSelectToggleMark} aria-hidden />
          </button>
        </span>
      ) : null}
      <WorkflowDocumentFileIcon fileName={doc.name} mimeType={doc.mimeType} modal />
      <div className={styles.docItemBody}>
        <div className={styles.docItemTitleRow}>
          <span className={styles.docItemName} title={doc.name}>
            {doc.name}
          </span>
          <div className={styles.docListItemActions}>
            {canDownload && onDownload != null ? (
              <button
                type="button"
                className={styles.inlineMenuIconBtn}
                disabled={isBusy}
                title={downloadTitle}
                aria-label={`${downloadTitle} ${doc.name}`}
                onClick={(event) => {
                  event.stopPropagation();
                  onDownload();
                }}
              >
                <span className={styles.inlineMenuDownloadIcon} aria-hidden />
              </button>
            ) : null}
            <button
              type="button"
              className={styles.inlineMenuIconBtn}
              disabled={isBusy}
              title={deleteTitle}
              aria-label={`${deleteTitle} ${doc.name}`}
              onClick={(event) => {
                event.stopPropagation();
                onDelete();
              }}
            >
              <span className={styles.inlineMenuDeleteIcon} aria-hidden />
            </button>
          </div>
        </div>
        <span className={styles.docItemMeta}>{metadataText}</span>
      </div>
    </li>
  );
}

export function ProjectDocumentsPanelContent({
  project,
  filter,
  searchQuery = '',
  itemsOverride,
  leadingFilter = null,
  onRefresh,
  onError,
  showStatusRefresh = true,
}: ProjectDocumentsPanelContentProps): ReactElement {
  const { catalogForProject } = useBuildCorePipelineStages();
  const workflowAccess = useBuildCoreWorkflowTaskAccess();
  const sectionAccess = useBuildCoreProjectSectionAccess();
  const stageCatalog = catalogForProject({ parentProjectId: project.summary.parentProjectId });
  const docsContent = content.projectDetail.documents;
  const wf = content.projectDetail.workflow;
  const { setToast, guardProjectEdit } = useProjectDetailShell();
  const rowSelection = useDocumentRowSelection();
  const isMobileLayout = useDashboardMobileLayout();
  const [busyDocId, setBusyDocId] = useState<string | null>(null);
  const selectionModeActive = rowSelection != null && isMobileLayout && rowSelection.selectedCount > 0;

  const { downloadDocument, deleteDocument } = useProjectDocumentModalActions({
    projectSlug: project.summary.slug,
    onChanged: onRefresh,
    onError: (message) => onError?.(message),
    onDemoDownloadBlocked: (message) => setToast({ kind: 'success', message }),
  });

  const taskById = useMemo(
    () => new Map(project.workflowTasks.map((task) => [task.id, task] as const)),
    [project.workflowTasks]
  );

  const budgetEntryById = useMemo(
    () => new Map(project.budget.entries.map((entry) => [entry.id, entry] as const)),
    [project.budget.entries]
  );

  const items = useMemo(() => {
    if (itemsOverride != null) return [...itemsOverride];
    const byFilter = filterDocumentPanelItems(
      buildDocumentPanelSourcesFromProject(project),
      filter
    );
    return filterDocumentPanelItemsBySearch(byFilter, searchQuery, stageCatalog);
  }, [filter, itemsOverride, project, searchQuery, stageCatalog]);

  const hasSelectableDocuments = useMemo(
    () => items.some((item) => item.kind === 'document'),
    [items]
  );

  const formatDocStageLabel = (workflowTaskId: string, stageSlug: PipelineStageSlug | null) => {
    const task = taskById.get(workflowTaskId);
    if (task) return formatWorkflowTaskStageLabel(task, stageCatalog);
    return stageSlug
      ? formatWorkflowTaskStageLabel({ stageSlug, amountCents: null }, stageCatalog)
      : docsContent.noStage;
  };

  const canDownloadDoc = (doc: CrmDocumentMetadata): boolean => {
    const domain = resolveCrmDocumentDownloadPermissionDomain(
      doc,
      doc.workflowTaskId ? taskById.get(doc.workflowTaskId) : undefined
    );
    if (domain == null) {
      return true;
    }
    if (domain === 'workflow_tasks') {
      return workflowAccess.isReady && workflowAccess.permissions.canDownload;
    }
    if (domain === 'payments') {
      return sectionAccess.payment.isReady && sectionAccess.payment.permissions.canDownload;
    }
    return sectionAccess.budget.isReady && sectionAccess.budget.permissions.canDownload;
  };

  const runDocAction = async (docId: string, action: () => Promise<void>) => {
    setBusyDocId(docId);
    try {
      await action();
    } finally {
      setBusyDocId(null);
    }
  };

  return (
    <div className={styles.documentsPanelContent}>
      <div className={styles.documentsPanelScroll}>
        {items.length === 0 ? (
          <div className={styles.docEmptyState}>
            <p className={styles.subtitle}>{docsContent.empty}</p>
          </div>
        ) : (
          <>
            {hasSelectableDocuments && !isMobileLayout ? (
              <DocumentsListHeaderRow
                leadingFilter={leadingFilter}
                onRefresh={onRefresh}
                onError={onError}
                showStatusRefresh={showStatusRefresh}
              />
            ) : null}
            <ul className={styles.docList}>
              {items.map((item) => {
                if (item.kind === 'missing') {
                  return (
                    <li
                      key={`missing-${item.task.id}`}
                      className={`${styles.docListItem} ${styles.docListItem_missing}`}
                    >
                      <WorkflowDocumentFileIcon fileName="file" mimeType="" modal />
                      <div className={styles.docItemBody}>
                        <span className={styles.docItemName}>{item.task.title}</span>
                        <span className={styles.docItemMeta}>
                          {docsContent.missingForTask} ·{' '}
                          {formatWorkflowTaskStageLabel(item.task, stageCatalog)}
                        </span>
                      </div>
                      <span className={styles.docCompletionMissing}>0/1</span>
                    </li>
                  );
                }

                if (item.kind === 'missing_budget') {
                  return (
                    <li
                      key={`missing-budget-${item.entry.id}`}
                      className={`${styles.docListItem} ${styles.docListItem_missing}`}
                    >
                      <WorkflowDocumentFileIcon fileName="file" mimeType="" modal />
                      <div className={styles.docItemBody}>
                        <span className={styles.docItemName}>{item.entry.itemName}</span>
                        <span className={styles.docItemMeta}>
                          {docsContent.missingForBudgetEntry} ·{' '}
                          {formatBudgetCategory(item.entry.category)}
                        </span>
                      </div>
                      <span className={styles.docCompletionMissing}>0/1</span>
                    </li>
                  );
                }

                const doc = item.document;
                const isBusy = busyDocId === doc.id;
                const isProjectMedia = doc.workflowTaskId == null && doc.budgetEntryId == null;
                const budgetEntry = doc.budgetEntryId
                  ? budgetEntryById.get(doc.budgetEntryId)
                  : undefined;
                const showRowSelect =
                  rowSelection != null && (!isMobileLayout || selectionModeActive);
                const isSelected = showRowSelect && rowSelection.selectedIds.has(doc.id);
                const metadataText = `${formatDocumentKind(doc.kind)} · ${
                  isProjectMedia
                    ? 'Project file'
                    : doc.workflowTaskId
                      ? formatDocStageLabel(doc.workflowTaskId, doc.stageSlug)
                      : budgetEntry
                        ? `${docsContent.uploadedForBudgetEntry} · ${budgetEntry.itemName} · ${formatBudgetCategory(budgetEntry.category)}`
                        : doc.stageSlug
                          ? formatWorkflowTaskStageLabel(
                              { stageSlug: doc.stageSlug, amountCents: null },
                              stageCatalog
                            )
                          : docsContent.noStage
                }${doc.uploadedAt ? ` · ${formatShortDate(doc.uploadedAt)}` : ''} · ${formatFileSize(doc.sizeBytes)}`;

                return (
                  <DocumentListFileRow
                    key={doc.id}
                    doc={doc}
                    isMobileLayout={isMobileLayout}
                    isSelected={isSelected}
                    showRowSelect={showRowSelect}
                    metadataText={metadataText}
                    isBusy={isBusy}
                    canDownload={canDownloadDoc(doc)}
                    selectItemAriaLabel={
                      rowSelection != null ? rowSelection.selectItemAriaLabel(doc.name) : undefined
                    }
                    onToggleSelection={
                      rowSelection != null ? () => rowSelection.onToggle(doc.id) : undefined
                    }
                    onDownload={
                      canDownloadDoc(doc)
                        ? () => void runDocAction(doc.id, () => downloadDocument(doc))
                        : undefined
                    }
                    onDelete={() => {
                      guardProjectEdit(() => {
                        void runDocAction(doc.id, () => deleteDocument(doc));
                      });
                    }}
                    downloadTitle={wf.documentDownload}
                    deleteTitle={wf.documentDelete}
                  />
                );
              })}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
