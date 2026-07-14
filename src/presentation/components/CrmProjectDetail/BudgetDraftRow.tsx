'use client';

import type { KeyboardEvent, ReactElement } from 'react';
import { useCallback, useMemo, useState } from 'react';
import { CRM_BUDGET_CATEGORIES, type CrmBudgetCategory } from '@/domain/crm';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { formatBudgetCategory } from '@/presentation/features/crmProjectDetail/budgetCategoryLabels';
import {
  costIncurredAtFromDateInput,
  defaultCostDateInput,
} from '@/presentation/features/crmProjectDetail/budgetCostDate';
import { parseUsdInputToCents } from '@/presentation/features/crmCreate/createCrmProjectFormModel';
import { formatCentsAsUsd } from '@/presentation/features/crmProjects/crmProjectFormatters';
import type { BudgetEntryDraft } from '@/presentation/features/crmProjectDetail/useBudgetEntryActions';
import { useDashboardMobileLayout } from '@/presentation/features/crmProjects/useDashboardMobileLayout';
import styles from './ProjectDetail.module.css';

type DocumentsRequiredChoice = 'yes' | 'no';

function BudgetDraftActions({
  b,
  saving,
  canSave,
  onSave,
  onCancel,
  mobile = false,
}: {
  readonly b: (typeof content.projectDetail.budget);
  readonly saving: boolean;
  readonly canSave: boolean;
  readonly onSave: () => void;
  readonly onCancel: () => void;
  readonly mobile?: boolean;
}): ReactElement {
  const actionClass = mobile
    ? styles.workflowTaskMobileDraftActions
    : `${styles.taskDeleteCell} ${styles.budgetDraftActions}`;

  return (
    <span className={actionClass}>
      <button
        type="button"
        className={styles.paymentDraftActionBtn}
        disabled={saving || !canSave}
        title={b.saveItem}
        aria-label={b.saveItem}
        onClick={onSave}
      >
        <span className={styles.taskDoneIcon} aria-hidden>
          ✓
        </span>
      </button>
      <button
        type="button"
        className={`${styles.paymentDraftActionBtn} ${styles.budgetDraftCancelBtn}`}
        disabled={saving}
        title={b.cancelItem}
        aria-label={b.cancelItem}
        onClick={onCancel}
      >
        <span className={styles.taskOpenIcon} aria-hidden />
      </button>
    </span>
  );
}

export type BudgetDraftRowProps = {
  onSave: (draft: BudgetEntryDraft) => Promise<void>;
  onCancel: () => void;
};

export function BudgetDraftRow({ onSave, onCancel }: BudgetDraftRowProps): ReactElement {
  const b = content.projectDetail.budget;
  const wf = content.projectDetail.workflow;
  const isMobileLayout = useDashboardMobileLayout();
  const [itemName, setItemName] = useState('');
  const [category, setCategory] = useState<CrmBudgetCategory>('labor');
  const [costUsd, setCostUsd] = useState('');
  const [budgetUsd, setBudgetUsd] = useState('');
  const [costDate, setCostDate] = useState(defaultCostDateInput);
  const [documentsRequired, setDocumentsRequired] = useState<DocumentsRequiredChoice>('yes');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const documentsRequiredOn = documentsRequired === 'yes';
  const canSave = itemName.trim().length > 0 && costDate.trim().length > 0 && !saving;

  const remainingDisplay = useMemo(() => {
    const costEmpty = !costUsd.trim();
    const budgetEmpty = !budgetUsd.trim();
    if (costEmpty && budgetEmpty) {
      return { text: '—', className: styles.budgetMutedCell };
    }
    const costCents = parseUsdInputToCents(costUsd) ?? 0;
    const budgetCents = parseUsdInputToCents(budgetUsd) ?? 0;
    const remainingCents = budgetCents - costCents;
    if (remainingCents > 0) {
      return { text: formatCentsAsUsd(remainingCents), className: styles.budgetRemainingUnder };
    }
    if (remainingCents < 0) {
      return { text: formatCentsAsUsd(remainingCents), className: styles.budgetRemainingOver };
    }
    return { text: formatCentsAsUsd(0), className: styles.budgetMutedCell };
  }, [budgetUsd, costUsd]);

  const handleSave = useCallback(async () => {
    if (saving) return;
    const name = itemName.trim();
    if (!name) {
      setError(b.itemNameRequired);
      return;
    }
    if (!costDate.trim()) {
      setError(b.costDateRequired);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const costIncurredAt = costIncurredAtFromDateInput(costDate);
      await onSave({
        itemName: name,
        category,
        costCents: parseUsdInputToCents(costUsd) ?? 0,
        budgetCents: parseUsdInputToCents(budgetUsd) ?? 0,
        costIncurredAt,
        documentsRequired: documentsRequiredOn,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : wf.taskSubmitFailed);
    } finally {
      setSaving(false);
    }
  }, [
    b.costDateRequired,
    b.itemNameRequired,
    budgetUsd,
    category,
    costDate,
    costUsd,
    documentsRequiredOn,
    itemName,
    onSave,
    saving,
    wf.taskSubmitFailed,
  ]);

  const handleDraftKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Escape') {
        onCancel();
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        void handleSave();
      }
    },
    [handleSave, onCancel]
  );

  const rowClass = `${styles.tableRow} ${styles.budgetGrid} ${styles.workflowInlineRow} ${styles.paymentDraftRow} ${styles.budgetDraftRow} ${styles.budgetDraftSwap}`;

  if (isMobileLayout) {
    return (
      <div className={styles.paymentDraftBlock}>
        <article
          className={`${styles.card} ${styles.workflowTaskMobileCard} ${styles.workflowTaskMobileDraftCard}`}
          aria-busy={saving}
        >
          <div className={styles.workflowTaskMobileCardHeader}>
            <div className={styles.workflowTaskMobileCardTitleWrap}>
              <input
                className={styles.workflowTaskMobileDraftTitleInput}
                value={itemName}
                disabled={saving}
                placeholder={b.itemNamePlaceholder}
                aria-label={b.columns.itemName}
                onChange={(e) => {
                  setItemName(e.target.value);
                  setError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void handleSave();
                  if (e.key === 'Escape') onCancel();
                }}
                autoFocus
              />
            </div>
            <BudgetDraftActions
              b={b}
              saving={saving}
              canSave={canSave}
              mobile
              onSave={() => void handleSave()}
              onCancel={onCancel}
            />
          </div>
          <div className={styles.workflowTaskMobileCardBody}>
          <div className={styles.workflowTaskMobileCardGrid3}>
            <div className={styles.workflowTaskMobileCardCell}>
              <span className={styles.projectInfoMobileLabel}>{b.columns.category}</span>
              <select
                className={`${styles.paymentDraftSelect} ${styles.workflowTaskMobileDraftField}`}
                value={category}
                disabled={saving}
                aria-label={b.columns.category}
                onChange={(e) => setCategory(e.target.value as CrmBudgetCategory)}
              >
                {CRM_BUDGET_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {formatBudgetCategory(cat)}
                  </option>
                ))}
              </select>
            </div>
            <div
              className={`${styles.workflowTaskMobileCardCell} ${styles.workflowTaskMobileCardCell_center}`}
            >
              <span className={styles.projectInfoMobileLabel}>{b.columns.documents}</span>
              <select
                className={`${styles.paymentDraftSelect} ${styles.workflowTaskMobileDraftField}`}
                value={documentsRequired}
                disabled={saving}
                aria-label={wf.fields.documentsRequired}
                onChange={(e) => setDocumentsRequired(e.target.value as DocumentsRequiredChoice)}
              >
                <option value="yes">{wf.fields.documentsRequiredYes}</option>
                <option value="no">{wf.fields.documentsRequiredNo}</option>
              </select>
            </div>
            <div
              className={`${styles.workflowTaskMobileCardCell} ${styles.workflowTaskMobileCardCell_right}`}
            >
              <span className={styles.projectInfoMobileLabel}>{b.columns.costDate}</span>
              <input
                type="date"
                className={`${styles.paymentDraftDateInput} ${styles.workflowTaskMobileDraftField}`}
                value={costDate}
                disabled={saving}
                required
                aria-label={b.columns.costDate}
                onChange={(e) => {
                  setCostDate(e.target.value);
                  setError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void handleSave();
                  if (e.key === 'Escape') onCancel();
                }}
              />
            </div>
          </div>
          <div className={styles.workflowTaskMobileCardGrid3}>
            <div className={styles.workflowTaskMobileCardCell}>
              <span className={styles.projectInfoMobileLabel}>{b.columns.cost}</span>
              <input
                className={`${styles.inlineFieldInput} ${styles.workflowTaskMobileDraftField}`}
                value={costUsd}
                disabled={saving}
                inputMode="decimal"
                placeholder="0.00"
                aria-label={b.columns.cost}
                onChange={(e) => setCostUsd(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void handleSave();
                  if (e.key === 'Escape') onCancel();
                }}
              />
            </div>
            <div
              className={`${styles.workflowTaskMobileCardCell} ${styles.workflowTaskMobileCardCell_center}`}
            >
              <span className={styles.projectInfoMobileLabel}>{b.columns.budget}</span>
              <input
                className={`${styles.inlineFieldInput} ${styles.workflowTaskMobileDraftField}`}
                value={budgetUsd}
                disabled={saving}
                inputMode="decimal"
                placeholder="0.00"
                aria-label={b.columns.budget}
                onChange={(e) => setBudgetUsd(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void handleSave();
                  if (e.key === 'Escape') onCancel();
                }}
              />
            </div>
            <div
              className={`${styles.workflowTaskMobileCardCell} ${styles.workflowTaskMobileCardCell_right}`}
            >
              <span className={styles.projectInfoMobileLabel}>{b.columns.remaining}</span>
              <span className={`${styles.workflowTaskMobileCardValue} ${remainingDisplay.className}`}>
                {remainingDisplay.text}
              </span>
            </div>
          </div>
          </div>
        </article>
        {error ? <p className={styles.paymentDraftError}>{error}</p> : null}
      </div>
    );
  }

  return (
    <div className={styles.paymentDraftBlock}>
      <div className={rowClass} role="row" aria-busy={saving}>
        <span className={styles.taskTitleCell}>
          <input
            className={styles.inlineFieldInput}
            value={itemName}
            disabled={saving}
            placeholder={b.itemNamePlaceholder}
            onChange={(e) => {
              setItemName(e.target.value);
              setError(null);
            }}
            onKeyDown={handleDraftKeyDown}
            autoFocus
          />
        </span>

        <span className={`${styles.workflowMetaCell} ${styles.budgetCategoryCell}`}>
          <select
            className={styles.paymentDraftSelect}
            value={category}
            disabled={saving}
            onChange={(e) => setCategory(e.target.value as CrmBudgetCategory)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') onCancel();
            }}
            aria-label={b.columns.category}
          >
            {CRM_BUDGET_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {formatBudgetCategory(cat)}
              </option>
            ))}
          </select>
        </span>

        <span className={`${styles.inlineAmountCell} ${styles.workflowMetaCell} ${styles.budgetAmountCell}`}>
          <input
            className={styles.inlineFieldInput}
            value={costUsd}
            disabled={saving}
            inputMode="decimal"
            placeholder="0.00"
            onChange={(e) => setCostUsd(e.target.value)}
            onKeyDown={handleDraftKeyDown}
            aria-label={b.columns.cost}
          />
        </span>

        <span className={`${styles.inlineAmountCell} ${styles.workflowMetaCell} ${styles.budgetAmountCell}`}>
          <input
            className={styles.inlineFieldInput}
            value={budgetUsd}
            disabled={saving}
            inputMode="decimal"
            placeholder="0.00"
            onChange={(e) => setBudgetUsd(e.target.value)}
            onKeyDown={handleDraftKeyDown}
            aria-label={b.columns.budget}
          />
        </span>

        <span className={`${styles.workflowMetaCell} ${styles.budgetRemainingCell}`}>
          <span className={remainingDisplay.className}>{remainingDisplay.text}</span>
        </span>

        <span className={`${styles.workflowMetaCell} ${styles.budgetCostDateCell}`}>
          <input
            type="date"
            className={styles.inlineFieldInput}
            value={costDate}
            disabled={saving}
            required
            aria-label={b.columns.costDate}
            onChange={(e) => {
              setCostDate(e.target.value);
              setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') onCancel();
            }}
          />
        </span>

        <span className={`${styles.inlineCellWrap} ${styles.workflowMetaCell}`}>
          <select
            className={styles.paymentDraftSelect}
            value={documentsRequired}
            disabled={saving}
            onChange={(e) => setDocumentsRequired(e.target.value as DocumentsRequiredChoice)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') onCancel();
            }}
            aria-label={b.columns.documents}
          >
            <option value="yes">{wf.documentsMarkRequired}</option>
            <option value="no">{wf.documentsNotRequired}</option>
          </select>
        </span>

        <BudgetDraftActions
          b={b}
          saving={saving}
          canSave={canSave}
          onSave={() => void handleSave()}
          onCancel={onCancel}
        />
      </div>
      {error ? <p className={styles.paymentDraftError}>{error}</p> : null}
    </div>
  );
}
