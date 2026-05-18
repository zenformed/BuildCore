'use client';

import type { ReactElement } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { CrmTradeType } from '@/domain/crm';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import {
  CRM_TRADE_TYPE_OPTIONS,
  getProjectTradeSubtitle,
} from '@/presentation/features/crmProjects/crmProjectFormatters';
import styles from './ProjectDetail.module.css';

export type ProjectHeaderTradeTypeProps = {
  tradeType: CrmTradeType;
  isSaving: boolean;
  onTradeTypeChange: (tradeType: string) => Promise<boolean>;
};

export function ProjectHeaderTradeType({
  tradeType,
  isSaving,
  onTradeTypeChange,
}: ProjectHeaderTradeTypeProps): ReactElement {
  const label = content.projectDetail.edit.fields.tradeType;
  const displayLabel = getProjectTradeSubtitle(tradeType) ?? tradeType;
  const [editing, setEditing] = useState(false);
  const selectRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    if (editing) selectRef.current?.focus();
  }, [editing]);

  const onChange = useCallback(
    async (next: string) => {
      setEditing(false);
      if (next === tradeType) return;
      await onTradeTypeChange(next);
    },
    [onTradeTypeChange, tradeType]
  );

  if (editing) {
    return (
      <p className={`${styles.subtitle} ${styles.headerTradeSubtitle}`}>
        <select
          ref={selectRef}
          className={styles.headerTradeSelect}
          value={tradeType}
          disabled={isSaving}
          aria-label={label}
          onChange={(e) => void onChange(e.target.value)}
          onBlur={() => setEditing(false)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault();
              setEditing(false);
            }
          }}
        >
          {CRM_TRADE_TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </p>
    );
  }

  return (
    <p className={`${styles.subtitle} ${styles.headerTradeSubtitle}`}>
      <button
        type="button"
        className={styles.headerTradeBtn}
        disabled={isSaving}
        onClick={() => setEditing(true)}
      >
        {displayLabel}
      </button>
    </p>
  );
}
