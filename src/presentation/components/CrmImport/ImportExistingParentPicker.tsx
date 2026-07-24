'use client';

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactElement,
} from 'react';
import type { CrmImportParentCandidate } from '@/domain/crm/spreadsheetImportParentSearch';
import { searchImportParentCandidates } from '@/domain/crm/spreadsheetImportParentSearch';
import styles from './SpreadsheetImportWizard.module.css';

export type ImportExistingParentPickerProps = {
  readonly candidates: readonly CrmImportParentCandidate[];
  readonly suggestedIds?: readonly string[];
  readonly selectedId: string | null;
  readonly selectedLabel?: string | null;
  readonly disabled?: boolean;
  readonly searchPlaceholder: string;
  readonly searchAriaLabel: string;
  readonly emptyLabel: string;
  readonly clearLabel: string;
  readonly suggestedLabel: string;
  readonly onSelect: (candidate: CrmImportParentCandidate) => void;
  readonly onClear: () => void;
};

export function ImportExistingParentPicker({
  candidates,
  suggestedIds = [],
  selectedId,
  selectedLabel,
  disabled = false,
  searchPlaceholder,
  searchAriaLabel,
  emptyLabel,
  clearLabel,
  suggestedLabel,
  onSelect,
  onClear,
}: ImportExistingParentPickerProps): ReactElement {
  const listboxId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const suggestedSet = useMemo(() => new Set(suggestedIds), [suggestedIds]);

  const results = useMemo(() => {
    const matched = searchImportParentCandidates(candidates, query);
    const suggested = matched.filter((c) => suggestedSet.has(c.id));
    const rest = matched.filter((c) => !suggestedSet.has(c.id));
    return [...suggested, ...rest];
  }, [candidates, query, suggestedSet]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, []);

  const commit = (candidate: CrmImportParentCandidate) => {
    onSelect(candidate);
    setQuery('');
    setOpen(false);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;
    if (!open && (event.key === 'ArrowDown' || event.key === 'Enter')) {
      setOpen(true);
      return;
    }
    if (!open) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, Math.max(results.length - 1, 0)));
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
      return;
    }
    if (event.key === 'Enter' && results[activeIndex]) {
      event.preventDefault();
      commit(results[activeIndex]!);
    }
  };

  const selected =
    selectedId != null ? candidates.find((c) => c.id === selectedId) : null;

  return (
    <div className={styles.parentPicker} ref={wrapRef}>
      {selectedId != null ? (
        <div className={styles.parentPickerSelected}>
          <div className={styles.parentPickerSelectedBody}>
            <span className={styles.parentPickerSelectedName}>
              {selected?.name ?? selectedLabel ?? selectedId}
            </span>
            {selected != null ? (
              <span className={styles.parentPickerSelectedMeta}>
                {[selected.clientName, selected.addressLabel].filter(Boolean).join(' · ')}
              </span>
            ) : null}
          </div>
          <button
            type="button"
            className={styles.parentPickerClear}
            disabled={disabled}
            onClick={() => {
              onClear();
              setQuery('');
            }}
          >
            {clearLabel}
          </button>
        </div>
      ) : null}

      <input
        type="search"
        className={styles.select}
        value={query}
        disabled={disabled}
        placeholder={searchPlaceholder}
        aria-label={searchAriaLabel}
        role="combobox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-autocomplete="list"
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
      />

      {open && !disabled ? (
        <div
          id={listboxId}
          className={styles.parentPickerMenu}
          role="listbox"
          aria-label={searchAriaLabel}
        >
          {results.length === 0 ? (
            <div className={styles.parentPickerEmpty}>{emptyLabel}</div>
          ) : (
            results.map((candidate, index) => {
              const isSuggested = suggestedSet.has(candidate.id);
              return (
                <button
                  key={candidate.id}
                  type="button"
                  role="option"
                  aria-selected={index === activeIndex}
                  className={[
                    styles.parentPickerOption,
                    index === activeIndex ? styles.parentPickerOptionActive : '',
                    isSuggested ? styles.parentPickerOptionSuggested : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => commit(candidate)}
                >
                  <span className={styles.parentPickerOptionName}>
                    {candidate.name}
                    {isSuggested ? (
                      <span className={styles.parentPickerSuggestedBadge}>{suggestedLabel}</span>
                    ) : null}
                  </span>
                  <span className={styles.parentPickerOptionMeta}>
                    {[candidate.clientName, candidate.addressLabel].filter(Boolean).join(' · ')}
                  </span>
                </button>
              );
            })
          )}
        </div>
      ) : null}
    </div>
  );
}
