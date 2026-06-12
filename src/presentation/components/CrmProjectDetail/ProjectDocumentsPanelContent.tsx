'use client';

import type { ChangeEvent, ReactElement } from 'react';
import { useMemo, useRef, useState } from 'react';
import type { CrmProjectDetail, PipelineStageSlug } from '@/domain/crm';
import { BUILDCORE_UPLOAD_ALLOWED_EXTENSIONS } from '@/domain/crm/buildCoreUploadPolicy';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { formatWorkflowTaskStageLabel } from '@/presentation/features/crmProjectDetail/crmProjectDetailFormatters';
import {
  filterDocumentPanelItems,
  type DocumentPanelFilter,
} from '@/presentation/features/crmProjectDetail/documentPanelModel';
import { useBuildCorePipelineStages } from '@/presentation/providers/BuildCorePipelineStagesProvider';
import { filterDocumentPanelItemsBySearch } from '@/presentation/features/crmProjectDetail/projectSectionSearchModel';
import {
  formatDocumentKind,
  formatFileSize,
  formatShortDate,
} from '@/presentation/features/crmProjectDetail/crmProjectDetailFormatters';
import { performCrmDirectUpload } from '@/presentation/features/crmDirectUpload/performBuildCoreDirectUpload';
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
  const { catalogForProject } = useBuildCorePipelineStages();
  const stageCatalog = catalogForProject({ parentProjectId: project.summary.parentProjectId });
  const docsContent = content.projectDetail.documents;
  const wf = content.projectDetail.workflow;
  const [filter, setFilter] = useState<DocumentPanelFilter>('all');
  const [busyDocId, setBusyDocId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    return filterDocumentPanelItemsBySearch(byFilter, searchQuery, stageCatalog);
  }, [filter, project.documents, project.workflowTasks, searchQuery, stageCatalog]);

  const formatDocStageLabel = (workflowTaskId: string, stageSlug: PipelineStageSlug | null) => {
    const task = taskById.get(workflowTaskId);
    if (task) return formatWorkflowTaskStageLabel(task, stageCatalog);
    return stageSlug
      ? formatWorkflowTaskStageLabel({ stageSlug, amountCents: null }, stageCatalog)
      : docsContent.noStage;
  };

  const runDocAction = async (docId: string, action: () => Promise<void>) => {
    setBusyDocId(docId);
    try {
      await action();
    } finally {
      setBusyDocId(null);
    }
  };

  const handleUploadSelected = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setUploading(true);
    try {
      await performCrmDirectUpload(file, {
        scope: 'project_media',
        projectSlug: project.summary.slug,
      });
      await onRefresh();
    } catch (err) {
      onError?.(err instanceof Error ? err.message : wf.documentUploadFailed);
    } finally {
      setUploading(false);
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
        <button
          type="button"
          className={styles.docFilterTab}
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
        >
          {uploading ? wf.taskSubmitting : wf.documentsUpload}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept={BUILDCORE_UPLOAD_ALLOWED_EXTENSIONS.join(',')}
          hidden
          onChange={(event) => void handleUploadSelected(event)}
        />
      </div>
      <p className={styles.subtitle}>{docsContent.uploadHint}</p>
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

            const doc = item.document;
            const isBusy = busyDocId === doc.id;
            const isProjectMedia = doc.workflowTaskId == null && doc.budgetEntryId == null;

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
                    {isProjectMedia
                      ? 'Project file'
                      : doc.workflowTaskId
                        ? formatDocStageLabel(doc.workflowTaskId, doc.stageSlug)
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
