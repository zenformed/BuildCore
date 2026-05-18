'use client';

import type { KeyboardEvent, ReactElement } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { SummaryEditableField } from '@/presentation/features/crmProjectDetail/projectDetailFormModel';
import styles from './ProjectDetail.module.css';

export type ProjectNotesInlineProps = {
  label: string;
  notes: string | null;
  savingField: SummaryEditableField | null;
  onPatch: (field: SummaryEditableField, value: string) => Promise<boolean>;
};

export function ProjectNotesInline({
  label,
  notes,
  savingField,
  onPatch,
}: ProjectNotesInlineProps): ReactElement {
  const value = notes ?? '';
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isSaving = savingField === 'notes';

  useEffect(() => {
    if (!editing) setDraft(value);
  }, [editing, value]);

  useEffect(() => {
    if (editing) {
      const el = textareaRef.current;
      el?.focus();
      if (el) {
        el.selectionStart = el.value.length;
        el.selectionEnd = el.value.length;
      }
    }
  }, [editing]);

  const cancel = useCallback(() => {
    setDraft(value);
    setEditing(false);
  }, [value]);

  const save = useCallback(async () => {
    setEditing(false);
    if (draft.trim() === value.trim()) {
      setDraft(value);
      return;
    }
    const ok = await onPatch('notes', draft);
    if (!ok) setDraft(value);
  }, [draft, onPatch, value]);

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        cancel();
      } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        void save();
      }
    },
    [cancel, save]
  );

  const displayText = value.trim() || 'Add notes…';
  const ghostText = editing ? draft || '\u00a0' : displayText;

  return (
    <p
      className={`${styles.detailSurface} ${styles.projectNotesCard} ${styles.notesInline}${isSaving ? ` ${styles.notesInline_saving}` : ''}`}
      role="group"
      aria-label={label}
      aria-busy={isSaving || undefined}
    >
      <span className={styles.nextStepLabel}>{label}</span>
      <span className={styles.notesValueSlot}>
        <span className={styles.notesGhost} aria-hidden>
          {ghostText}
        </span>
        {editing ? (
          <textarea
            ref={textareaRef}
            className={styles.notesTextareaOverlay}
            value={draft}
            disabled={isSaving}
            aria-label={label}
            rows={1}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => void save()}
            onKeyDown={onKeyDown}
          />
        ) : (
          <button
            type="button"
            className={`${styles.notesDisplayOverlay}${!value.trim() ? ` ${styles.notesDisplayOverlay_empty}` : ''}`}
            disabled={isSaving}
            onClick={() => setEditing(true)}
          >
            {displayText}
          </button>
        )}
      </span>
      {isSaving ? <span className={styles.notesInlineSavingHint}> · Saving…</span> : null}
    </p>
  );
}
