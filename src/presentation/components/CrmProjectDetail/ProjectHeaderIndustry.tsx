'use client';

import type { ReactElement } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { CrmIndustry } from '@/domain/crm';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import {
  CRM_INDUSTRY_OPTIONS,
  getProjectIndustryDisplayLabel,
} from '@/presentation/features/crmProjects/crmProjectFormatters';
import styles from './ProjectDetail.module.css';

export type ProjectHeaderIndustryProps = {
  industry: CrmIndustry;
  customIndustry: string | null;
  isSaving: boolean;
  onIndustryChange: (industry: CrmIndustry, customIndustry: string) => Promise<boolean>;
};

export function ProjectHeaderIndustry({
  industry,
  customIndustry,
  isSaving,
  onIndustryChange,
}: ProjectHeaderIndustryProps): ReactElement {
  const fields = content.projectDetail.edit.fields;
  const displayLabel = getProjectIndustryDisplayLabel(industry, customIndustry);
  const [editing, setEditing] = useState(false);
  const [draftIndustry, setDraftIndustry] = useState(industry);
  const [draftCustomIndustry, setDraftCustomIndustry] = useState(customIndustry ?? '');
  const selectRef = useRef<HTMLSelectElement>(null);
  const customInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) {
      setDraftIndustry(industry);
      setDraftCustomIndustry(customIndustry ?? '');
    }
  }, [customIndustry, editing, industry]);

  useEffect(() => {
    if (editing) {
      selectRef.current?.focus();
    }
  }, [editing]);

  const commitChange = useCallback(
    async (nextIndustry: CrmIndustry, nextCustomIndustry: string) => {
      const normalizedCustom = nextIndustry === 'other' ? nextCustomIndustry.trim() : '';
      if (
        nextIndustry === industry &&
        normalizedCustom === (customIndustry ?? '').trim()
      ) {
        setEditing(false);
        return;
      }
      const ok = await onIndustryChange(nextIndustry, normalizedCustom);
      if (ok) {
        setEditing(false);
      }
    },
    [customIndustry, industry, onIndustryChange]
  );

  const onSelectChange = useCallback(
    (next: string) => {
      const nextIndustry = next as CrmIndustry;
      setDraftIndustry(nextIndustry);
      if (nextIndustry !== 'other') {
        setDraftCustomIndustry('');
        void commitChange(nextIndustry, '');
        return;
      }
      setDraftCustomIndustry('');
      customInputRef.current?.focus();
    },
    [commitChange]
  );

  if (editing) {
    return (
      <div className={`${styles.subtitle} ${styles.headerTradeSubtitle} ${styles.headerIndustryEdit}`}>
        <select
          ref={selectRef}
          className={styles.headerTradeSelect}
          value={draftIndustry}
          disabled={isSaving}
          aria-label={fields.industry}
          onChange={(e) => onSelectChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault();
              setEditing(false);
            }
          }}
        >
          {CRM_INDUSTRY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {draftIndustry === 'other' ? (
          <input
            ref={customInputRef}
            className={styles.headerIndustryCustomInput}
            value={draftCustomIndustry}
            disabled={isSaving}
            aria-label={fields.customIndustry}
            placeholder={fields.customIndustry}
            onChange={(e) => setDraftCustomIndustry(e.target.value)}
            onBlur={() => {
              if (draftCustomIndustry.trim()) {
                void commitChange('other', draftCustomIndustry);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (draftCustomIndustry.trim()) {
                  void commitChange('other', draftCustomIndustry);
                }
              }
              if (e.key === 'Escape') {
                e.preventDefault();
                setEditing(false);
              }
            }}
          />
        ) : null}
      </div>
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
