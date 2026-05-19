'use client';

import type { ReactElement } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  BUILDCORE_DOCUMENT_ALLOWED_EXTENSIONS,
} from '@/domain/crm/documentUpload';
import { CRM_BUDGET_CATEGORIES, type CrmBudgetEntry, type CrmDocumentMetadata } from '@/domain/crm';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { formatBudgetCategory } from '@/presentation/features/crmProjectDetail/budgetCategoryLabels';
import { parseUsdInputToCents } from '@/presentation/features/crmCreate/createCrmProjectFormModel';
import { formatCentsAsUsd } from '@/presentation/features/crmProjects/crmProjectFormatters';
import { centsToUsdInput } from '@/presentation/features/crmProjectDetail/workflowTaskFormModel';
import type { BudgetEntryDraft } from '@/presentation/features/crmProjectDetail/useBudgetEntryActions';
import { useBudgetEntryDocumentActions } from '@/presentation/features/crmProjectDetail/useBudgetEntryDocumentActions';
import { WorkflowDocumentFileIcon } from './WorkflowDocumentFileIcon';
import { WorkflowInlineMenu } from './WorkflowInlineMenu';
import styles from './ProjectDetail.module.css';

export type BudgetInlineRowProps = {
  projectSlug: string;
  entry: CrmBudgetEntry;
  entryDocuments: readonly CrmDocumentMetadata[];
  onSave: (entryId: string, patch: Partial<BudgetEntryDraft>) => Promise<void>;
  onRefresh: () => Promise<void>;
  onError?: (message: string) => void;
  onRequestDelete?: () => void;
};

export function BudgetInlineRow({
  projectSlug,
  entry,
  entryDocuments,
  onSave,
  onRefresh,
  onError,
  onRequestDelete,
}: BudgetInlineRowProps): ReactElement {
  const b = content.projectDetail.budget;
  const wf = content.projectDetail.workflow;
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(entry.itemName);
  const [editingCost, setEditingCost] = useState(false);
  const [costDraft, setCostDraft] = useState(centsToUsdInput(entry.costCents));
  const [editingBudget, setEditingBudget] = useState(false);
  const [budgetDraft, setBudgetDraft] = useState(centsToUsdInput(entry.budgetCents));
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);
  const [documentsMenuOpen, setDocumentsMenuOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const categoryRef = useRef<HTMLDivElement>(null);
  const documentsRef = useRef<HTMLDivElement>(null);

  const documentActions = useBudgetEntryDocumentActions({
    projectSlug,
    budgetEntryId: entry.id,
    onChanged: onRefresh,
    onError: (message) => onError?.(message),
  });
  const documentAccept = BUILDCORE_DOCUMENT_ALLOWED_EXTENSIONS.join(',');

  useEffect(() => {
    if (!editingName) setNameDraft(entry.itemName);
  }, [editingName, entry.itemName]);

  useEffect(() => {
    if (!editingCost) setCostDraft(centsToUsdInput(entry.costCents));
  }, [editingCost, entry.costCents]);

  useEffect(() => {
    if (!editingBudget) setBudgetDraft(centsToUsdInput(entry.budgetCents));
  }, [editingBudget, entry.budgetCents]);

  const reportError = useCallback(
    (err: unknown) => {
      onError?.(err instanceof Error ? err.message : wf.taskSubmitFailed);
    },
    [onError, wf.taskSubmitFailed]
  );

  const commit = useCallback(
    async (patch: Partial<BudgetEntryDraft>) => {
      setSaving(true);
      try {
        await onSave(entry.id, patch);
      } catch (err) {
        reportError(err);
      } finally {
        setSaving(false);
      }
    },
    [entry.id, onSave, reportError]
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
    async (documentsRequired: boolean) => {
      setDocumentsMenuOpen(false);
      if (documentsRequired === entry.documentsRequired) return;
      await commit({ documentsRequired });
    },
    [commit, entry.documentsRequired]
  );

  const remainingCents = entry.budgetCents - entry.costCents;
  const effectiveDocCount = Math.max(entry.documentCount, entryDocuments.length);
  const hasDocuments = effectiveDocCount > 0;
  const documentsLabel = hasDocuments
    ? `${effectiveDocCount} ${wf.documentsCountSuffix}`
    : !entry.documentsRequired
      ? wf.documentsNotRequired
      : wf.documentsNone;
  const showDocumentsIcon = hasDocuments || entry.documentsRequired;

  const rowClass = `${styles.tableRow} ${styles.budgetGrid} ${styles.workflowInlineRow}`;

  return (
    <div className={rowClass} role="row" aria-busy={saving}>
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
            disabled={saving}
            title={entry.itemName}
            onClick={() => {
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
          disabled={saving}
          aria-expanded={categoryMenuOpen}
          onClick={() => {
            setDocumentsMenuOpen(false);
            setCategoryMenuOpen((open) => !open);
          }}
        >
          {formatBudgetCategory(entry.category)}
        </button>
        <WorkflowInlineMenu
          open={categoryMenuOpen}
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
            disabled={saving}
            onClick={() => {
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
            disabled={saving}
            onClick={() => {
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
        <span
          className={
            remainingCents > 0
              ? styles.budgetRemainingUnder
              : remainingCents < 0
                ? styles.budgetRemainingOver
                : styles.budgetMutedCell
          }
        >
          {formatCentsAsUsd(remainingCents)}
        </span>
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
          className={styles.hiddenFileInput}
          onChange={(e) => void documentActions.handleFileSelected(e)}
        />
        <WorkflowInlineMenu
          open={documentsMenuOpen}
          onClose={() => setDocumentsMenuOpen(false)}
          anchorRef={documentsRef}
        >
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
          {entryDocuments.map((doc) => (
            <div key={doc.id} className={styles.inlineMenuDocRow}>
              <WorkflowDocumentFileIcon fileName={doc.name} mimeType={doc.mimeType} compact />
              <span className={styles.inlineMenuDocName} title={doc.name}>
                {doc.name}
              </span>
              <button
                type="button"
                className={styles.inlineMenuIconBtn}
                disabled={saving || documentActions.uploading}
                title={wf.documentDownload}
                aria-label={`${wf.documentDownload} ${doc.name}`}
                onClick={() => {
                  setDocumentsMenuOpen(false);
                  void documentActions.downloadDocument(doc.id);
                }}
              >
                <span className={styles.inlineMenuDownloadIcon} aria-hidden />
              </button>
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
            </div>
          ))}
          {!entry.documentsRequired ? (
            <button
              type="button"
              className={styles.inlineMenuAction}
              disabled={saving}
              onClick={() => void saveDocumentsRequired(true)}
            >
              {wf.documentsMarkRequired}
            </button>
          ) : null}
          {entry.documentsRequired && entryDocuments.length === 0 ? (
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
        <button
          type="button"
          className={styles.taskDeleteBtn}
          disabled={saving || !onRequestDelete}
          title={b.deleteItem}
          aria-label={b.deleteItem}
          onClick={() => {
            setCategoryMenuOpen(false);
            setDocumentsMenuOpen(false);
            onRequestDelete?.();
          }}
        >
          <span aria-hidden>🗑️</span>
        </button>
      </span>
    </div>
  );
}
