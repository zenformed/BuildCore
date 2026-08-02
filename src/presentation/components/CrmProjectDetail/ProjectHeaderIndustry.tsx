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
  const rootRef = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    if (editing && draftIndustry === 'other') {
      customInputRef.current?.focus();
    }
  }, [draftIndustry, editing]);

  useEffect(() => {
    if (!editing) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (rootRef.current == null) return;
      if (rootRef.current.contains(event.target as Node)) return;
      setEditing(false);
    };
    window.addEventListener('mousedown', handlePointerDown);
    return () => window.removeEventListener('mousedown', handlePointerDown);
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
    },
    [commitChange]
  );

  return (
    <div ref={rootRef} className={`${styles.subtitle} ${styles.headerTradeSubtitle} ${styles.headerIndustryEditor}`}>
      <button
        type="button"
        className={`${styles.headerTradeBtn}${editing ? ` ${styles.headerTradeBtn_active}` : ''}`}
        disabled={isSaving}
        aria-expanded={editing}
        aria-haspopup="listbox"
        onClick={() => setEditing((open) => !open)}
      >
        {displayLabel}
      </button>
      {editing ? (
        <div className={styles.headerIndustryMenu}>
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
      ) : null}
    </div>
  );
}
