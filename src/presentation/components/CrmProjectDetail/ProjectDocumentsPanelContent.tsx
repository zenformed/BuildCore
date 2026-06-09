'use client';

import type { ReactElement } from 'react';
import { useMemo, useState } from 'react';
import type { CrmProjectDetail, PipelineStageSlug } from '@/domain/crm';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { formatWorkflowTaskStageLabel } from '@/presentation/features/crmProjectDetail/crmProjectDetailFormatters';
import {
  filterDocumentPanelItems,
  type DocumentPanelFilter,
} from '@/presentation/features/crmProjectDetail/documentPanelModel';
import { filterDocumentPanelItemsBySearch } from '@/presentation/features/crmProjectDetail/projectSectionSearchModel';
import {
  formatDocumentKind,
  formatFileSize,
  formatShortDate,
} from '@/presentation/features/crmProjectDetail/crmProjectDetailFormatters';
import { useProjectDocumentModalActions } from '@/presentation/features/crmProjectDetail/useProjectDocumentModalActions';
import { WorkflowDocumentFileIcon } from './WorkflowDocumentFileIcon';
import styles from './ProjectDetail.module.css';

const FILTERS: readonly { id: DocumentPanelFilter; label: string }[] = [
  { id: 'all', label: content.projectDetail.documents.filters.all },
  { id: 'uploaded', label: content.projectDetail.documents.filters.uploaded },
  { id: 'missing', label: content.projectDetail.documents.filters.missing },
] as const;

export type ProjectDocumentsPanelContentProps = {
  project: CrmProjectDetail;
  searchQuery?: string;
  onRefresh: () => Promise<void>;
  onError?: (message: string) => void;
};

export function ProjectDocumentsPanelContent({
  project,
  searchQuery = '',
  onRefresh,
  onError,
}: ProjectDocumentsPanelContentProps): ReactElement {
  const docsContent = content.projectDetail.documents;
  const wf = content.projectDetail.workflow;
  const [filter, setFilter] = useState<DocumentPanelFilter>('all');
  const [busyDocId, setBusyDocId] = useState<string | null>(null);

  const { downloadDocument, deleteDocument } = useProjectDocumentModalActions({
    projectSlug: project.summary.slug,
    onChanged: onRefresh,
    onError: (message) => onError?.(message),
  });

  const taskById = useMemo(
    () => new Map(project.workflowTasks.map((task) => [task.id, task] as const)),
    [project.workflowTasks]
  );

  const items = useMemo(() => {
    const byFilter = filterDocumentPanelItems(project.documents, project.workflowTasks, filter);
    return filterDocumentPanelItemsBySearch(byFilter, searchQuery);
  }, [filter, project.documents, project.workflowTasks, searchQuery]);

  const formatDocStageLabel = (workflowTaskId: string, stageSlug: PipelineStageSlug | null) => {
    const task = taskById.get(workflowTaskId);
    if (task) return formatWorkflowTaskStageLabel(task);
    return stageSlug ? formatWorkflowTaskStageLabel({ stageSlug, amountCents: null }) : docsContent.noStage;
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
      <div className={styles.docFilterRow} role="tablist" aria-label={docsContent.filterAriaLabel}>
        {FILTERS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={filter === tab.id}
            className={filter === tab.id ? styles.docFilterTab_active : styles.docFilterTab}
            onClick={() => setFilter(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
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
                      {docsContent.missingForTask} · {formatWorkflowTaskStageLabel(item.task)}
                    </span>
                  </div>
                  <span className={styles.docCompletionMissing}>0/1</span>
                </li>
              );
            }

            const doc = item.document;
            const isBusy = busyDocId === doc.id;

            return (
              <li key={doc.id} className={`${styles.docListItem} ${styles.docListItem_hasFile}`}>
                <WorkflowDocumentFileIcon fileName={doc.name} mimeType={doc.mimeType} modal />
                <div className={styles.docItemBody}>
                  <div className={styles.docItemTitleRow}>
                    <span className={styles.docItemName} title={doc.name}>
                      {doc.name}
                    </span>
                    <div className={styles.docListItemActions}>
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
                      <button
                        type="button"
                        className={styles.inlineMenuIconBtn}
                        disabled={isBusy}
                        title={wf.documentDelete}
                        aria-label={`${wf.documentDelete} ${doc.name}`}
                        onClick={() => void runDocAction(doc.id, () => deleteDocument(doc))}
                      >
                        <span className={styles.inlineMenuDeleteIcon} aria-hidden />
                      </button>
                    </div>
                  </div>
                  <span className={styles.docItemMeta}>
                    {formatDocumentKind(doc.kind)} ·{' '}
                    {doc.workflowTaskId
                      ? formatDocStageLabel(doc.workflowTaskId, doc.stageSlug)
                      : doc.stageSlug
                        ? formatWorkflowTaskStageLabel({ stageSlug: doc.stageSlug, amountCents: null })
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
