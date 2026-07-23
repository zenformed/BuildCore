'use client';

import type { ReactElement } from 'react';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import {
  BUILDCORE_UPLOAD_ALLOWED_EXTENSIONS,
} from '@/domain/crm/buildCoreUploadPolicy';
import { CRM_BUDGET_CATEGORIES, type CrmBudgetEntry, type CrmDocumentMetadata } from '@/domain/crm';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { formatBudgetCategory } from '@/presentation/features/crmProjectDetail/budgetCategoryLabels';
import { parseUsdInputToCents } from '@/presentation/features/crmCreate/createCrmProjectFormModel';
import { formatCentsAsUsd } from '@/presentation/features/crmProjects/crmProjectFormatters';
import { formatWorkflowTaskMobileCardTitle } from '@/presentation/features/crmProjectDetail/crmProjectDetailFormatters';
import { centsToUsdInput } from '@/presentation/features/crmProjectDetail/workflowTaskFormModel';
import type { BudgetEntryDraft } from '@/presentation/features/crmProjectDetail/useBudgetEntryActions';
import {
  costIncurredAtFromDateInput,
  dateInputFromCostIncurredAt,
  formatCostDateDisplay,
} from '@/presentation/features/crmProjectDetail/budgetCostDate';
import { useProjectDetailShell } from '@/presentation/features/crmProjectDetail/ProjectDetailShellContext';
import { useBudgetEntryRowSelection } from '@/presentation/features/crmProjectDetail/budgetEntryRowSelectionContext';
import { projectSupportsSendAttachment } from '@/presentation/features/communications/sendAttachmentEligibility';
import { useAssignmentIdentityCatalog } from '@/presentation/providers/AssignmentIdentityProvider';
import { useBuildCoreProjectSectionAccess } from '@/presentation/providers/BuildCoreProjectSectionAccessProvider';
import { useBudgetEntryDocumentActions } from '@/presentation/features/crmProjectDetail/useBudgetEntryDocumentActions';
import { BulkSelectCheckbox } from '@/presentation/components/BulkSelection/BulkSelectCheckbox';
import { WorkflowDocumentFileIcon } from './WorkflowDocumentFileIcon';
import { DocumentsGalleryPreview } from './DocumentsGalleryPreview';
import { BudgetRowActionsMenu } from './BudgetRowActionsMenu';
import { WorkflowInlineMenu } from './WorkflowInlineMenu';
import { CenterConfirmDialog } from '@/presentation/components/CenterConfirmDialog';
import styles from './ProjectDetail.module.css';

export type BudgetInlineRowProps = {
  projectSlug: string;
  entry: CrmBudgetEntry;
  entryDocuments: readonly CrmDocumentMetadata[];
  onSave: (entryId: string, patch: Partial<BudgetEntryDraft>) => Promise<void>;
  onError?: (message: string) => void;
  onRequestDelete?: () => void;
  variant?: 'table' | 'mobile';
};

export function BudgetInlineRow({
  projectSlug,
  entry,
  entryDocuments,
  onSave,
  onError,
  onRequestDelete,
  variant = 'table',
}: BudgetInlineRowProps): ReactElement {
  const b = content.projectDetail.budget;
  const wf = content.projectDetail.workflow;
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(entry.itemName);
  const [editingCost, setEditingCost] = useState(false);
  const [costDraft, setCostDraft] = useState(centsToUsdInput(entry.costCents));
  const [editingBudget, setEditingBudget] = useState(false);
  const [budgetDraft, setBudgetDraft] = useState(centsToUsdInput(entry.budgetCents));
  const [editingCostDate, setEditingCostDate] = useState(false);
  const [costDateDraft, setCostDateDraft] = useState(dateInputFromCostIncurredAt(entry.costIncurredAt));
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);
  const [documentsMenuOpen, setDocumentsMenuOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewDocumentId, setPreviewDocumentId] = useState<string | null>(null);
  const cameraInputId = useId();

  const categoryRef = useRef<HTMLDivElement>(null);
  const documentsRef = useRef<HTMLDivElement>(null);

  const {
    onBudgetEntryDocumentUploaded,
    onBudgetEntryDocumentDeleted,
    openSendAttachmentDialogForBudgetEntry,
    project,
    isApiSource,
    setToast,
    projectMutationsLocked,
  } = useProjectDetailShell();
  const assignmentCatalog = useAssignmentIdentityCatalog();
  const { budget: budgetAccess } = useBuildCoreProjectSectionAccess();
  const { permissions, isReady } = budgetAccess;
  const canEdit = isReady && permissions.canEdit && !projectMutationsLocked;
  const canUpload = isReady && permissions.canUpload && !projectMutationsLocked;
  const canDownload = isReady && permissions.canDownload;
  const canSendFiles = isReady && permissions.canSendFiles && !projectMutationsLocked;
  const canDelete = isReady && permissions.canDelete && !projectMutationsLocked;
  const showSendAttachment =
    canSendFiles && projectSupportsSendAttachment(project, assignmentCatalog, isApiSource);
  const showActionsMenu = showSendAttachment || (canDelete && onRequestDelete != null);
  const documentActions = useBudgetEntryDocumentActions({
    projectSlug,
    budgetEntryId: entry.id,
    onDocumentUploaded: onBudgetEntryDocumentUploaded,
    onDocumentDeleted: onBudgetEntryDocumentDeleted,
    onError: (message) => onError?.(message),
    onDemoDownloadBlocked: (message) => setToast({ kind: 'success', message }),
  });
  const documentAccept = BUILDCORE_UPLOAD_ALLOWED_EXTENSIONS.join(',');

  useEffect(() => {
    if (!editingName) setNameDraft(entry.itemName);
  }, [editingName, entry.itemName]);

  useEffect(() => {
    if (!editingCost) setCostDraft(centsToUsdInput(entry.costCents));
  }, [editingCost, entry.costCents]);

  useEffect(() => {
    if (!editingBudget) setBudgetDraft(centsToUsdInput(entry.budgetCents));
  }, [editingBudget, entry.budgetCents]);

  useEffect(() => {
    if (!editingCostDate) setCostDateDraft(dateInputFromCostIncurredAt(entry.costIncurredAt));
  }, [editingCostDate, entry.costIncurredAt]);

  const reportError = useCallback(
    (err: unknown) => {
      onError?.(err instanceof Error ? err.message : wf.taskSubmitFailed);
    },
    [onError, wf.taskSubmitFailed]
  );

  const commit = useCallback(
    async (patch: Partial<BudgetEntryDraft>) => {
      if (!canEdit) return;
      setSaving(true);
      try {
        await onSave(entry.id, patch);
      } catch (err) {
        reportError(err);
      } finally {
        setSaving(false);
      }
    },
    [canEdit, entry.id, onSave, reportError]
  );

  const saveName = useCallback(async () => {
    const itemName = nameDraft.trim();
    setEditingName(false);
    if (!itemName || itemName === entry.itemName) {
      setNameDraft(entry.itemName);
      return;
    }
    await commit({ itemName });
  }, [commit, entry.itemName, nameDraft]);

  const saveCost = useCallback(async () => {
    const costCents = parseUsdInputToCents(costDraft);
    if (costCents == null) {
      onError?.('Cost must be a valid USD value.');
      setCostDraft(centsToUsdInput(entry.costCents));
      setEditingCost(false);
      return;
    }
    if (costCents === entry.costCents) {
      setEditingCost(false);
      return;
    }
    await commit({ costCents });
    setEditingCost(false);
  }, [commit, costDraft, entry.costCents, onError]);

  const saveCostDate = useCallback(async () => {
    setEditingCostDate(false);
    try {
      const iso = costIncurredAtFromDateInput(costDateDraft);
      if (iso === entry.costIncurredAt) return;
      await commit({ costIncurredAt: iso });
    } catch (err) {
      reportError(err);
      setCostDateDraft(dateInputFromCostIncurredAt(entry.costIncurredAt));
    }
  }, [commit, costDateDraft, entry.costIncurredAt, reportError]);

  const saveBudget = useCallback(async () => {
    const budgetCents = parseUsdInputToCents(budgetDraft);
    if (budgetCents == null) {
      onError?.('Budget must be a valid USD value.');
      setBudgetDraft(centsToUsdInput(entry.budgetCents));
      setEditingBudget(false);
      return;
    }
    if (budgetCents === entry.budgetCents) {
      setEditingBudget(false);
      return;
    }
    await commit({ budgetCents });
    setEditingBudget(false);
  }, [budgetDraft, commit, entry.budgetCents, onError]);

  const saveDocumentsRequired = useCallback(
    async (
      documentsRequired: boolean,
      options?: { readonly keepMenuOpen?: boolean }
    ) => {
      if (!options?.keepMenuOpen) {
        setDocumentsMenuOpen(false);
      }
      if (documentsRequired === entry.documentsRequired) return;
      await commit({ documentsRequired });
    },
    [commit, entry.documentsRequired]
  );

  const remainingCents = entry.budgetCents - entry.costCents;
  const effectiveDocCount = Math.max(entry.documentCount, entryDocuments.length);
  const hasDocuments = effectiveDocCount > 0;
  const documentsLabel = hasDocuments
    ? `${effectiveDocCount}`
    : !entry.documentsRequired
      ? wf.documentsNotRequired
      : wf.documentsNone;
  const showDocumentsIcon = hasDocuments || entry.documentsRequired;

  const rowSelection = useBudgetEntryRowSelection();
  const showRowSelect = rowSelection != null && (variant === 'table' || variant === 'mobile');
  const isSelected = showRowSelect && rowSelection.selectedIds.has(entry.id);
  const mobileCardTitle = formatWorkflowTaskMobileCardTitle(entry.itemName);
  const rowClass = [
    styles.tableRow,
    styles.budgetGrid,
    styles.workflowInlineRow,
    isSelected ? styles.tableRow_selected : '',
  ]
    .filter(Boolean)
    .join(' ');

  const remainingClass =
    remainingCents > 0
      ? styles.budgetRemainingUnder
      : remainingCents < 0
        ? styles.budgetRemainingOver
        : styles.budgetMutedCell;

  const handleRequestDelete = (): void => {
    setCategoryMenuOpen(false);
    setDocumentsMenuOpen(false);
    onRequestDelete?.();
  };

  const handleSendAttachment = (): void => {
    setCategoryMenuOpen(false);
    setDocumentsMenuOpen(false);
    openSendAttachmentDialogForBudgetEntry(entry, entryDocuments);
  };

  const documentsGalleryPreview =
    previewDocumentId != null ? (
      <DocumentsGalleryPreview
        documents={entryDocuments}
        orderedIds={entryDocuments.map((doc) => doc.id)}
        initialDocumentId={previewDocumentId}
        resolveProjectSlug={() => projectSlug}
        resolveProjectLabel={() => project.summary.name}
        resolveTaskTitle={() => entry.itemName}
        onDownloadDocument={async (doc) => {
          await documentActions.downloadDocument(doc.id, doc.name);
        }}
        onDeleteDocument={
          canDelete
            ? async (doc) => {
                await documentActions.deleteDocument(doc.id);
              }
            : undefined
        }
        canDeleteDocument={() => canDelete}
        onClose={() => setPreviewDocumentId(null)}
      />
    ) : null;

  if (variant === 'mobile') {
    const mobileValueBtn = styles.workflowTaskMobileCardValueBtn;
    const mobileValue = styles.workflowTaskMobileCardValue;
    const mobileControl = styles.workflowTaskMobileCardControl;

    return (
      <>
      <article
        className={[
          styles.card,
          styles.workflowTaskMobileCard,
          isSelected ? styles.workflowTaskMobileCard_selected : '',
        ]
          .filter(Boolean)
          .join(' ')}
        aria-label={entry.itemName}
        aria-busy={saving}
        aria-selected={showRowSelect ? isSelected : undefined}
      >
        <div className={styles.workflowTaskMobileCardHeader}>
          {showRowSelect && rowSelection != null ? (
            <span className={styles.workflowTaskMobileCardSelect}>
              <BulkSelectCheckbox
                checked={isSelected}
                ariaLabel={rowSelection.selectItemAriaLabel(entry.itemName)}
                onChange={() => rowSelection.onToggle(entry.id)}
              />
            </span>
          ) : null}
          <div className={styles.workflowTaskMobileCardTitleWrap}>
            {editingName ? (
              <input
                className={styles.workflowTaskMobileDraftTitleInput}
                value={nameDraft}
                disabled={saving}
                aria-label={b.columns.itemName}
                onChange={(e) => setNameDraft(e.target.value)}
                onBlur={() => void saveName()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void saveName();
                  if (e.key === 'Escape') {
                    setNameDraft(entry.itemName);
                    setEditingName(false);
                  }
                }}
                autoFocus
              />
            ) : (
              <button
                type="button"
                className={styles.workflowTaskMobileCardTitleBtn}
                disabled={saving || !canEdit}
                title={entry.itemName}
                onClick={() => {
                  if (!canEdit) return;
                  setCategoryMenuOpen(false);
                  setDocumentsMenuOpen(false);
                  setNameDraft(entry.itemName);
                  setEditingName(true);
                }}
              >
                <span className={styles.workflowTaskMobileCardTitle}>{mobileCardTitle}</span>
              </button>
            )}
          </div>
          {showActionsMenu ? (
            <div className={styles.workflowTaskMobileCardActions}>
              <BudgetRowActionsMenu
                itemName={entry.itemName}
                disabled={saving}
                showSendAttachment={showSendAttachment}
                onSendAttachment={handleSendAttachment}
                onDelete={canDelete && onRequestDelete ? handleRequestDelete : undefined}
              />
            </div>
          ) : null}
        </div>
        <div className={styles.workflowTaskMobileCardBody}>
        <div className={styles.workflowTaskMobileCardGrid3}>
          <div className={styles.workflowTaskMobileCardCell}>
            <span className={styles.projectInfoMobileLabel}>{b.columns.category}</span>
            <div className={mobileControl} ref={categoryRef}>
              <button
                type="button"
                className={canEdit ? mobileValueBtn : mobileValue}
                disabled={saving || !canEdit}
                aria-expanded={categoryMenuOpen}
                onClick={() => {
                  if (!canEdit) return;
                  setDocumentsMenuOpen(false);
                  setCategoryMenuOpen((open) => !open);
                }}
              >
                <span className={canEdit ? mobileValue : undefined}>
                  {formatBudgetCategory(entry.category)}
                </span>
              </button>
              <WorkflowInlineMenu
                open={categoryMenuOpen && canEdit}
                onClose={() => setCategoryMenuOpen(false)}
                anchorRef={categoryRef}
              >
                {CRM_BUDGET_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    className={styles.inlineMenuAction}
                    disabled={saving || cat === entry.category}
                    onClick={() => {
                      setCategoryMenuOpen(false);
                      void commit({ category: cat });
                    }}
                  >
                    {formatBudgetCategory(cat)}
                  </button>
                ))}
              </WorkflowInlineMenu>
            </div>
          </div>
          <div
            className={`${styles.workflowTaskMobileCardCell} ${styles.workflowTaskMobileCardCell_center}`}
          >
            <span className={styles.projectInfoMobileLabel}>{b.columns.documents}</span>
            <div className={mobileControl} ref={documentsRef}>
              <button
                type="button"
                className={`${mobileValueBtn} ${styles.documentsCell}`}
                disabled={saving}
                aria-expanded={documentsMenuOpen}
                onClick={() => {
                  setCategoryMenuOpen(false);
                  setDocumentsMenuOpen((open) => !open);
                }}
              >
                {showDocumentsIcon ? <span className={styles.documentsIcon} aria-hidden /> : null}
                <span
                  className={`${mobileValue} ${
                    !entry.documentsRequired && !hasDocuments ? styles.documentsNotRequired : ''
                  }`}
                >
                  {documentsLabel}
                </span>
              </button>
              <input
                ref={documentActions.fileInputRef}
                type="file"
                accept={documentAccept}
                multiple
                className={styles.hiddenFileInput}
                onChange={(e) => void documentActions.handleFileSelected(e, 'files')}
              />
              <input
                ref={documentActions.cameraFileInputRef}
                id={cameraInputId}
                type="file"
                accept="image/*"
                capture="environment"
                className={styles.hiddenFileInput}
                onChange={(e) => {
                  setDocumentsMenuOpen(false);
                  void documentActions.handleFileSelected(e, 'camera');
                }}
              />
              {(() => {
                const closeDocumentsMenu = (): void => setDocumentsMenuOpen(false);
                const docsRequired = entry.documentsRequired;
                const sourceBusy = saving || documentActions.uploading;
                const documentRows = entryDocuments.map((doc) => (
                  <div key={doc.id} className={styles.inlineMenuDocRow}>
                    <WorkflowDocumentFileIcon fileName={doc.name} mimeType={doc.mimeType} compact />
                    <button
                      type="button"
                      className={styles.inlineMenuDocNameBtn}
                      title={doc.name}
                      disabled={sourceBusy}
                      onClick={() => {
                        closeDocumentsMenu();
                        setPreviewDocumentId(doc.id);
                      }}
                    >
                      {doc.name}
                    </button>
                    {canDownload ? (
                      <button
                        type="button"
                        className={styles.inlineMenuIconBtn}
                        disabled={sourceBusy}
                        title={wf.documentDownload}
                        aria-label={`${wf.documentDownload} ${doc.name}`}
                        onClick={() => {
                          closeDocumentsMenu();
                          void documentActions.downloadDocument(doc.id, doc.name);
                        }}
                      >
                        <span className={styles.inlineMenuDownloadIcon} aria-hidden />
                      </button>
                    ) : null}
                    {canDelete ? (
                      <button
                        type="button"
                        className={styles.inlineMenuIconBtn}
                        disabled={sourceBusy}
                        title={wf.documentDelete}
                        aria-label={`${wf.documentDelete} ${doc.name}`}
                        onClick={() => {
                          closeDocumentsMenu();
                          void documentActions.deleteDocument(doc.id);
                        }}
                      >
                        <span className={styles.inlineMenuDeleteIcon} aria-hidden />
                      </button>
                    ) : null}
                  </div>
                ));

                return (
                  <CenterConfirmDialog
                    isOpen={documentsMenuOpen}
                    title={entry.itemName}
                    body={
                      <div className={styles.documentsActionSheetBody}>
                        {canUpload || canEdit ? (
                          <div className={styles.documentsSourceGrid}>
                            {canUpload ? (
                              <>
                                <button
                                  type="button"
                                  className={styles.documentsSourceBtn}
                                  disabled={sourceBusy}
                                  onClick={() => {
                                    documentActions.openFilePicker();
                                    closeDocumentsMenu();
                                  }}
                                >
                                  <span className={styles.documentsSourceIconWrap}>
                                    <span className={styles.documentsSourceIconCircle} aria-hidden>
                                      <span className={styles.inlineMenuUploadIcon} />
                                    </span>
                                  </span>
                                  <span className={styles.documentsSourceLabel}>
                                    {wf.documentsFiles}
                                  </span>
                                </button>
                                <button
                                  type="button"
                                  className={styles.documentsSourceBtn}
                                  disabled={sourceBusy}
                                  onClick={() => {
                                    documentActions.openCameraPicker();
                                  }}
                                >
                                  <span className={styles.documentsSourceIconWrap}>
                                    <span className={styles.documentsSourceIconCircle} aria-hidden>
                                      <span className={styles.inlineMenuCameraIcon} />
                                    </span>
                                  </span>
                                  <span className={styles.documentsSourceLabel}>
                                    {wf.documentsCamera}
                                  </span>
                                </button>
                              </>
                            ) : null}
                            {canEdit ? (
                              <>
                                <button
                                  type="button"
                                  className={`${styles.documentsSourceBtn} ${
                                    docsRequired ? styles.documentsSourceBtnSelected : ''
                                  }`}
                                  disabled={saving}
                                  aria-pressed={docsRequired}
                                  onClick={() => {
                                    if (!docsRequired) {
                                      void saveDocumentsRequired(true, { keepMenuOpen: true });
                                    }
                                  }}
                                >
                                  <span className={styles.documentsSourceIconWrap}>
                                    <span className={styles.documentsSourceIconCircle} aria-hidden>
                                      <span className={styles.documentsRequiredIcon} />
                                    </span>
                                    {docsRequired ? (
                                      <span className={styles.documentsSourceCheck} aria-hidden />
                                    ) : null}
                                  </span>
                                  <span className={styles.documentsSourceLabel}>
                                    {wf.documentsMarkRequired}
                                  </span>
                                </button>
                                <button
                                  type="button"
                                  className={`${styles.documentsSourceBtn} ${
                                    !docsRequired ? styles.documentsSourceBtnSelected : ''
                                  }`}
                                  disabled={
                                    saving || (docsRequired && entryDocuments.length > 0)
                                  }
                                  aria-pressed={!docsRequired}
                                  onClick={() => {
                                    if (docsRequired && entryDocuments.length === 0) {
                                      void saveDocumentsRequired(false, { keepMenuOpen: true });
                                    }
                                  }}
                                >
                                  <span className={styles.documentsSourceIconWrap}>
                                    <span className={styles.documentsSourceIconCircle} aria-hidden>
                                      <span className={styles.documentsNaIcon} />
                                    </span>
                                    {!docsRequired ? (
                                      <span className={styles.documentsSourceCheck} aria-hidden />
                                    ) : null}
                                  </span>
                                  <span className={styles.documentsSourceLabel}>
                                    {wf.documentsNotRequired}
                                  </span>
                                </button>
                              </>
                            ) : null}
                          </div>
                        ) : null}
                        {documentRows.length > 0 ? (
                          <div className={styles.documentsActionSheetDocList}>{documentRows}</div>
                        ) : null}
                      </div>
                    }
                    hideActions
                    cancelLabel={content.projectDetail.edit.cancel}
                    onClose={closeDocumentsMenu}
                    closeAriaLabel={wf.documentsMenuCloseAriaLabel}
                    panelClassName={styles.documentsActionSheetPanel}
                    titleClassName={styles.documentsActionSheetTitle}
                    bodyClassName={styles.documentsActionSheetBodyWrap}
                  />
                );
              })()}
            </div>
          </div>
          <div
            className={`${styles.workflowTaskMobileCardCell} ${styles.workflowTaskMobileCardCell_right}`}
          >
            <span className={styles.projectInfoMobileLabel}>{b.columns.costDate}</span>
            <span className={mobileControl}>
              {editingCostDate ? (
                <input
                  type="date"
                  className={`${styles.inlineFieldInput} ${styles.workflowTaskMobileDraftField}`}
                  value={costDateDraft}
                  disabled={saving}
                  aria-label={b.columns.costDate}
                  onChange={(e) => setCostDateDraft(e.target.value)}
                  onBlur={() => void saveCostDate()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void saveCostDate();
                    if (e.key === 'Escape') {
                      setCostDateDraft(dateInputFromCostIncurredAt(entry.costIncurredAt));
                      setEditingCostDate(false);
                    }
                  }}
                  autoFocus
                />
              ) : (
                <button
                  type="button"
                  className={canEdit ? mobileValueBtn : mobileValue}
                  disabled={saving || !canEdit}
                  onClick={() => {
                    if (!canEdit) return;
                    setCategoryMenuOpen(false);
                    setDocumentsMenuOpen(false);
                    setCostDateDraft(dateInputFromCostIncurredAt(entry.costIncurredAt));
                    setEditingCostDate(true);
                  }}
                >
                  <span className={canEdit ? mobileValue : undefined}>
                    {formatCostDateDisplay(entry.costIncurredAt)}
                  </span>
                </button>
              )}
            </span>
          </div>
        </div>
        <div className={styles.workflowTaskMobileCardGrid3}>
          <div className={styles.workflowTaskMobileCardCell}>
            <span className={styles.projectInfoMobileLabel}>{b.columns.cost}</span>
            <span className={mobileControl}>
              {editingCost ? (
                <input
                  className={styles.inlineFieldInput}
                  value={costDraft}
                  disabled={saving}
                  inputMode="decimal"
                  aria-label={b.columns.cost}
                  onChange={(e) => setCostDraft(e.target.value)}
                  onBlur={() => void saveCost()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void saveCost();
                    if (e.key === 'Escape') {
                      setCostDraft(centsToUsdInput(entry.costCents));
                      setEditingCost(false);
                    }
                  }}
                  autoFocus
                />
              ) : (
                <button
                  type="button"
                  className={canEdit ? mobileValueBtn : mobileValue}
                  disabled={saving || !canEdit}
                  onClick={() => {
                    if (!canEdit) return;
                    setCategoryMenuOpen(false);
                    setDocumentsMenuOpen(false);
                    setCostDraft(centsToUsdInput(entry.costCents));
                    setEditingCost(true);
                  }}
                >
                  <span className={canEdit ? mobileValue : undefined}>
                    {formatCentsAsUsd(entry.costCents)}
                  </span>
                </button>
              )}
            </span>
          </div>
          <div
            className={`${styles.workflowTaskMobileCardCell} ${styles.workflowTaskMobileCardCell_center}`}
          >
            <span className={styles.projectInfoMobileLabel}>{b.columns.budget}</span>
            <span className={mobileControl}>
              {editingBudget ? (
                <input
                  className={styles.inlineFieldInput}
                  value={budgetDraft}
                  disabled={saving}
                  inputMode="decimal"
                  aria-label={b.columns.budget}
                  onChange={(e) => setBudgetDraft(e.target.value)}
                  onBlur={() => void saveBudget()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void saveBudget();
                    if (e.key === 'Escape') {
                      setBudgetDraft(centsToUsdInput(entry.budgetCents));
                      setEditingBudget(false);
                    }
                  }}
                  autoFocus
                />
              ) : (
                <button
                  type="button"
                  className={canEdit ? mobileValueBtn : mobileValue}
                  disabled={saving || !canEdit}
                  onClick={() => {
                    if (!canEdit) return;
                    setCategoryMenuOpen(false);
                    setDocumentsMenuOpen(false);
                    setBudgetDraft(centsToUsdInput(entry.budgetCents));
                    setEditingBudget(true);
                  }}
                >
                  <span className={canEdit ? mobileValue : undefined}>
                    {formatCentsAsUsd(entry.budgetCents)}
                  </span>
                </button>
              )}
            </span>
          </div>
          <div
            className={`${styles.workflowTaskMobileCardCell} ${styles.workflowTaskMobileCardCell_right}`}
          >
            <span className={styles.projectInfoMobileLabel}>{b.columns.remaining}</span>
            <span className={`${mobileValue} ${remainingClass}`}>
              {formatCentsAsUsd(remainingCents)}
            </span>
          </div>
        </div>
        </div>
      </article>
      {documentsGalleryPreview}
      </>
    );
  }

  return (
    <>
    <div
      className={rowClass}
      role="row"
      aria-busy={saving}
      aria-selected={showRowSelect ? isSelected : undefined}
    >
      {showRowSelect ? (
        <span className={styles.workflowSelectCell} role="cell">
          <BulkSelectCheckbox
            checked={isSelected}
            ariaLabel={rowSelection.selectItemAriaLabel(entry.itemName)}
            onChange={() => rowSelection.onToggle(entry.id)}
          />
        </span>
      ) : (
        <span className={styles.workflowSelectCell} aria-hidden />
      )}
      <span className={styles.taskTitleCell}>
        {editingName ? (
          <input
            className={styles.inlineFieldInput}
            value={nameDraft}
            disabled={saving}
            onChange={(e) => setNameDraft(e.target.value)}
            onBlur={() => void saveName()}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void saveName();
              if (e.key === 'Escape') {
                setNameDraft(entry.itemName);
                setEditingName(false);
              }
            }}
            autoFocus
          />
        ) : (
          <button
            type="button"
            className={styles.inlineCellBtn}
            disabled={saving || !canEdit}
            title={entry.itemName}
            onClick={() => {
              if (!canEdit) return;
              setCategoryMenuOpen(false);
              setDocumentsMenuOpen(false);
              setNameDraft(entry.itemName);
              setEditingName(true);
            }}
          >
            <span className={styles.taskTitleBtnText}>{entry.itemName}</span>
          </button>
        )}
      </span>

      <span
        className={`${styles.inlineCellWrap} ${styles.workflowMetaCell} ${styles.budgetCategoryCell}`}
        ref={categoryRef}
      >
        <button
          type="button"
          className={styles.inlineCellBtn}
          disabled={saving || !canEdit}
          aria-expanded={categoryMenuOpen}
          onClick={() => {
            if (!canEdit) return;
            setDocumentsMenuOpen(false);
            setCategoryMenuOpen((open) => !open);
          }}
        >
          {formatBudgetCategory(entry.category)}
        </button>
        <WorkflowInlineMenu
          open={categoryMenuOpen && canEdit}
          onClose={() => setCategoryMenuOpen(false)}
          anchorRef={categoryRef}
        >
          {CRM_BUDGET_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              className={styles.inlineMenuAction}
              disabled={saving || cat === entry.category}
              onClick={() => {
                setCategoryMenuOpen(false);
                void commit({ category: cat });
              }}
            >
              {formatBudgetCategory(cat)}
            </button>
          ))}
        </WorkflowInlineMenu>
      </span>

      <span className={`${styles.inlineAmountCell} ${styles.workflowMetaCell} ${styles.budgetAmountCell}`}>
        {editingCost ? (
          <input
            className={styles.inlineFieldInput}
            value={costDraft}
            disabled={saving}
            inputMode="decimal"
            onChange={(e) => setCostDraft(e.target.value)}
            onBlur={() => void saveCost()}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void saveCost();
              if (e.key === 'Escape') {
                setCostDraft(centsToUsdInput(entry.costCents));
                setEditingCost(false);
              }
            }}
            autoFocus
          />
        ) : (
          <button
            type="button"
            className={styles.inlineCellBtn}
            disabled={saving || !canEdit}
            onClick={() => {
              if (!canEdit) return;
              setCategoryMenuOpen(false);
              setDocumentsMenuOpen(false);
              setCostDraft(centsToUsdInput(entry.costCents));
              setEditingCost(true);
            }}
          >
            {formatCentsAsUsd(entry.costCents)}
          </button>
        )}
      </span>

      <span className={`${styles.inlineAmountCell} ${styles.workflowMetaCell} ${styles.budgetAmountCell}`}>
        {editingBudget ? (
          <input
            className={styles.inlineFieldInput}
            value={budgetDraft}
            disabled={saving}
            inputMode="decimal"
            onChange={(e) => setBudgetDraft(e.target.value)}
            onBlur={() => void saveBudget()}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void saveBudget();
              if (e.key === 'Escape') {
                setBudgetDraft(centsToUsdInput(entry.budgetCents));
                setEditingBudget(false);
              }
            }}
            autoFocus
          />
        ) : (
          <button
            type="button"
            className={styles.inlineCellBtn}
            disabled={saving || !canEdit}
            onClick={() => {
              if (!canEdit) return;
              setCategoryMenuOpen(false);
              setDocumentsMenuOpen(false);
              setBudgetDraft(centsToUsdInput(entry.budgetCents));
              setEditingBudget(true);
            }}
          >
            {formatCentsAsUsd(entry.budgetCents)}
          </button>
        )}
      </span>

      <span className={`${styles.workflowMetaCell} ${styles.budgetRemainingCell}`}>
        <span className={remainingClass}>
          {formatCentsAsUsd(remainingCents)}
        </span>
      </span>

      <span className={`${styles.workflowMetaCell} ${styles.budgetCostDateCell}`}>
        {editingCostDate ? (
          <input
            type="date"
            className={styles.inlineFieldInput}
            value={costDateDraft}
            disabled={saving}
            aria-label={b.columns.costDate}
            onChange={(e) => setCostDateDraft(e.target.value)}
            onBlur={() => void saveCostDate()}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void saveCostDate();
              if (e.key === 'Escape') {
                setCostDateDraft(dateInputFromCostIncurredAt(entry.costIncurredAt));
                setEditingCostDate(false);
              }
            }}
            autoFocus
          />
        ) : (
          <button
            type="button"
            className={styles.inlineCellBtn}
            disabled={saving || !canEdit}
            onClick={() => {
              if (!canEdit) return;
              setCategoryMenuOpen(false);
              setDocumentsMenuOpen(false);
              setCostDateDraft(dateInputFromCostIncurredAt(entry.costIncurredAt));
              setEditingCostDate(true);
            }}
          >
            {formatCostDateDisplay(entry.costIncurredAt)}
          </button>
        )}
      </span>

      <span className={`${styles.inlineCellWrap} ${styles.workflowMetaCell}`} ref={documentsRef}>
        <button
          type="button"
          className={`${styles.inlineCellBtn} ${styles.documentsCell}`}
          disabled={saving}
          aria-expanded={documentsMenuOpen}
          onClick={() => {
            setCategoryMenuOpen(false);
            setDocumentsMenuOpen((open) => !open);
          }}
        >
          {showDocumentsIcon ? <span className={styles.documentsIcon} aria-hidden /> : null}
          <span
            className={
              !entry.documentsRequired && !hasDocuments ? styles.documentsNotRequired : undefined
            }
          >
            {documentsLabel}
          </span>
        </button>
        <input
          ref={documentActions.fileInputRef}
          type="file"
          accept={documentAccept}
          multiple
          className={styles.hiddenFileInput}
          onChange={(e) => void documentActions.handleFileSelected(e, 'files')}
        />
        <WorkflowInlineMenu
          open={documentsMenuOpen}
          onClose={() => setDocumentsMenuOpen(false)}
          anchorRef={documentsRef}
        >
          {canUpload ? (
            <button
              type="button"
              className={`${styles.inlineMenuAction} ${styles.inlineMenuUploadAction}`}
              disabled={saving || documentActions.uploading}
              onClick={() => {
                setDocumentsMenuOpen(false);
                documentActions.openFilePicker();
              }}
            >
              <span className={styles.inlineMenuUploadIcon} aria-hidden />
              {wf.documentsUpload}
            </button>
          ) : null}
          {entryDocuments.map((doc) => (
            <div key={doc.id} className={styles.inlineMenuDocRow}>
              <WorkflowDocumentFileIcon fileName={doc.name} mimeType={doc.mimeType} compact />
              <button
                type="button"
                className={styles.inlineMenuDocNameBtn}
                title={doc.name}
                disabled={saving || documentActions.uploading}
                onClick={() => {
                  setDocumentsMenuOpen(false);
                  setPreviewDocumentId(doc.id);
                }}
              >
                {doc.name}
              </button>
              {canDownload ? (
                <button
                  type="button"
                  className={styles.inlineMenuIconBtn}
                  disabled={saving || documentActions.uploading}
                  title={wf.documentDownload}
                  aria-label={`${wf.documentDownload} ${doc.name}`}
                  onClick={() => {
                    setDocumentsMenuOpen(false);
                    void documentActions.downloadDocument(doc.id, doc.name);
                  }}
                >
                  <span className={styles.inlineMenuDownloadIcon} aria-hidden />
                </button>
              ) : null}
              {canDelete ? (
                <button
                  type="button"
                  className={styles.inlineMenuIconBtn}
                  disabled={saving || documentActions.uploading}
                  title={wf.documentDelete}
                  aria-label={`${wf.documentDelete} ${doc.name}`}
                  onClick={() => {
                    setDocumentsMenuOpen(false);
                    void documentActions.deleteDocument(doc.id);
                  }}
                >
                  <span className={styles.inlineMenuDeleteIcon} aria-hidden />
                </button>
              ) : null}
            </div>
          ))}
          {canEdit && !entry.documentsRequired ? (
            <button
              type="button"
              className={styles.inlineMenuAction}
              disabled={saving}
              onClick={() => void saveDocumentsRequired(true)}
            >
              {wf.documentsMarkRequired}
            </button>
          ) : null}
          {canEdit && entry.documentsRequired && entryDocuments.length === 0 ? (
            <button
              type="button"
              className={styles.inlineMenuAction}
              disabled={saving}
              onClick={() => void saveDocumentsRequired(false)}
            >
              {wf.documentsNotRequired}
            </button>
          ) : null}
        </WorkflowInlineMenu>
      </span>

      <span className={styles.taskDeleteCell}>
        {showActionsMenu ? (
          <BudgetRowActionsMenu
            itemName={entry.itemName}
            disabled={saving}
            showSendAttachment={showSendAttachment}
            onSendAttachment={handleSendAttachment}
            onDelete={canDelete && onRequestDelete ? handleRequestDelete : undefined}
          />
        ) : null}
      </span>
    </div>
    {documentsGalleryPreview}
    </>
  );
}
