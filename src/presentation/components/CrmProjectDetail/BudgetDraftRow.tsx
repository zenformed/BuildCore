'use client';

import type { ReactElement } from 'react';
import { useCallback, useState } from 'react';
import { CRM_BUDGET_CATEGORIES, type CrmBudgetCategory } from '@/domain/crm';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { formatBudgetCategory } from '@/presentation/features/crmProjectDetail/budgetCategoryLabels';
import {
  costIncurredAtFromDateInput,
  defaultCostDateInput,
} from '@/presentation/features/crmProjectDetail/budgetCostDate';
import { parseUsdInputToCents } from '@/presentation/features/crmCreate/createCrmProjectFormModel';
import type { BudgetEntryDraft } from '@/presentation/features/crmProjectDetail/useBudgetEntryActions';
import styles from './ProjectDetail.module.css';

type DocumentsRequiredChoice = 'yes' | 'no';

export type BudgetDraftRowProps = {
  onSave: (draft: BudgetEntryDraft) => Promise<void>;
  onCancel: () => void;
};

export function BudgetDraftRow({ onSave, onCancel }: BudgetDraftRowProps): ReactElement {
  const b = content.projectDetail.budget;
  const wf = content.projectDetail.workflow;
  const [itemName, setItemName] = useState('');
  const [category, setCategory] = useState<CrmBudgetCategory>('labor');
  const [costUsd, setCostUsd] = useState('');
  const [budgetUsd, setBudgetUsd] = useState('');
  const [costDate, setCostDate] = useState(defaultCostDateInput);
  const [documentsRequired, setDocumentsRequired] = useState<DocumentsRequiredChoice>('yes');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const documentsRequiredOn = documentsRequired === 'yes';

  const handleSave = useCallback(async () => {
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
    wf.taskSubmitFailed,
  ]);

  const rowClass = `${styles.tableRow} ${styles.budgetGrid} ${styles.workflowInlineRow} ${styles.paymentDraftRow}`;

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
            onKeyDown={(e) => {
              if (e.key === 'Enter') void handleSave();
              if (e.key === 'Escape') onCancel();
            }}
            autoFocus
          />
        </span>

        <span className={`${styles.workflowMetaCell} ${styles.budgetCategoryCell}`}>
          <select
            className={styles.paymentDraftSelect}
            value={category}
            disabled={saving}
            onChange={(e) => setCategory(e.target.value as CrmBudgetCategory)}
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
            onKeyDown={(e) => {
              if (e.key === 'Enter') void handleSave();
              if (e.key === 'Escape') onCancel();
            }}
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
            onKeyDown={(e) => {
              if (e.key === 'Enter') void handleSave();
              if (e.key === 'Escape') onCancel();
            }}
            aria-label={b.columns.budget}
          />
        </span>

        <span className={`${styles.workflowMetaCell} ${styles.budgetRemainingCell}`}>
          <span className={styles.budgetMutedCell}>—</span>
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
              if (e.key === 'Enter') void handleSave();
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
            aria-label={wf.fields.documentsRequired}
          >
            <option value="yes">{wf.fields.documentsRequiredYes}</option>
            <option value="no">{wf.fields.documentsRequiredNo}</option>
          </select>
        </span>

        <span className={`${styles.taskDeleteCell} ${styles.paymentDraftActions}`}>
          <button
            type="button"
            className={styles.paymentDraftActionBtn}
            disabled={saving}
            title={b.saveItem}
            aria-label={b.saveItem}
            onClick={() => void handleSave()}
          >
            <span className={styles.taskDoneIcon} aria-hidden>
              ✓
            </span>
          </button>
          <button
            type="button"
            className={styles.paymentDraftActionBtn}
            disabled={saving}
            title={b.cancelItem}
            aria-label={b.cancelItem}
            onClick={onCancel}
          >
            <span className={styles.taskOpenIcon} aria-hidden />
          </button>
        </span>
      </div>
      {error ? <p className={styles.paymentDraftError}>{error}</p> : null}
    </div>
  );
}
