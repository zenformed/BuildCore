'use client';

import type { ReactElement } from 'react';
import { useMemo, useState } from 'react';
import type { CrmProjectDetail, PipelineStageSlug, CrmDocumentMetadata } from '@/domain/crm';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { formatWorkflowTaskStageLabel } from '@/presentation/features/crmProjectDetail/crmProjectDetailFormatters';
import {
  buildDocumentPanelSourcesFromProject,
  filterDocumentPanelItems,
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
import { useProjectDetailShell } from '@/presentation/features/crmProjectDetail/ProjectDetailShellContext';
import { WorkflowDocumentFileIcon } from './WorkflowDocumentFileIcon';
import styles from './ProjectDetail.module.css';

export type ProjectDocumentsPanelContentProps = {
  project: CrmProjectDetail;
  filter: DocumentPanelFilter;
  searchQuery?: string;
  onRefresh: () => Promise<void>;
  onError?: (message: string) => void;
};

export function ProjectDocumentsPanelContent({
  project,
  filter,
  searchQuery = '',
  onRefresh,
  onError,
}: ProjectDocumentsPanelContentProps): ReactElement {
  const { catalogForProject } = useBuildCorePipelineStages();
  const workflowAccess = useBuildCoreWorkflowTaskAccess();
  const sectionAccess = useBuildCoreProjectSectionAccess();
  const stageCatalog = catalogForProject({ parentProjectId: project.summary.parentProjectId });
  const docsContent = content.projectDetail.documents;
  const wf = content.projectDetail.workflow;
  const { setToast, guardProjectEdit } = useProjectDetailShell();
  const [busyDocId, setBusyDocId] = useState<string | null>(null);

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
    const byFilter = filterDocumentPanelItems(
      buildDocumentPanelSourcesFromProject(project),
      filter
    );
    return filterDocumentPanelItemsBySearch(byFilter, searchQuery, stageCatalog);
  }, [filter, project, searchQuery, stageCatalog]);

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
        <ul className={styles.docList}>
          {items.map((item) => {
            if (item.kind === 'missing') {
              return (
                <li key={`missing-${item.task.id}`} className={`${styles.docListItem} ${styles.docListItem_missing}`}>
                  <WorkflowDocumentFileIcon fileName="file" mimeType="" modal />
                  <div className={styles.docItemBody}>
                    <span className={styles.docItemName}>{item.task.title}</span>
                    <span className={styles.docItemMeta}>
                      {docsContent.missingForTask} · {formatWorkflowTaskStageLabel(item.task, stageCatalog)}
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
                      {docsContent.missingForBudgetEntry} · {formatBudgetCategory(item.entry.category)}
                    </span>
                  </div>
                  <span className={styles.docCompletionMissing}>0/1</span>
                </li>
              );
            }

            const doc = item.document;
            const isBusy = busyDocId === doc.id;
            const isProjectMedia = doc.workflowTaskId == null && doc.budgetEntryId == null;
            const budgetEntry = doc.budgetEntryId ? budgetEntryById.get(doc.budgetEntryId) : undefined;

            return (
              <li key={doc.id} className={`${styles.docListItem} ${styles.docListItem_hasFile}`}>
                <WorkflowDocumentFileIcon fileName={doc.name} mimeType={doc.mimeType} modal />
                <div className={styles.docItemBody}>
                  <div className={styles.docItemTitleRow}>
                    <span className={styles.docItemName} title={doc.name}>
                      {doc.name}
                    </span>
                    <div className={styles.docListItemActions}>
                      {canDownloadDoc(doc) ? (
                        <button
                          type="button"
                          className={styles.inlineMenuIconBtn}
                          disabled={isBusy}
                          title={wf.documentDownload}
                          aria-label={`${wf.documentDownload} ${doc.name}`}
                          onClick={() => void runDocAction(doc.id, () => downloadDocument(doc))}
                        >
                          <span className={styles.inlineMenuDownloadIcon} aria-hidden />
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className={styles.inlineMenuIconBtn}
                        disabled={isBusy}
                        title={wf.documentDelete}
                        aria-label={`${wf.documentDelete} ${doc.name}`}
                        onClick={() => {
                          guardProjectEdit(() => {
                            void runDocAction(doc.id, () => deleteDocument(doc));
                          });
                        }}
                      >
                        <span className={styles.inlineMenuDeleteIcon} aria-hidden />
                      </button>
                    </div>
                  </div>
                  <span className={styles.docItemMeta}>
                    {formatDocumentKind(doc.kind)} ·{' '}
                    {isProjectMedia
                      ? 'Project file'
                      : doc.workflowTaskId
                        ? formatDocStageLabel(doc.workflowTaskId, doc.stageSlug)
                        : budgetEntry
                          ? `${docsContent.uploadedForBudgetEntry} · ${budgetEntry.itemName} · ${formatBudgetCategory(budgetEntry.category)}`
                          : doc.stageSlug
                            ? formatWorkflowTaskStageLabel({ stageSlug: doc.stageSlug, amountCents: null }, stageCatalog)
                            : docsContent.noStage}
                    {doc.uploadedAt ? ` · ${formatShortDate(doc.uploadedAt)}` : null}
                    {` · ${formatFileSize(doc.sizeBytes)}`}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      </div>
    </div>
  );
}
