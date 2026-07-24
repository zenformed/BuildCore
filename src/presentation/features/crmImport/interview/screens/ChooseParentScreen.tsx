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
import { LuBuilding2, LuCheck, LuChevronDown, LuChevronRight, LuSearch } from 'react-icons/lu';
import type { CrmImportParentCandidate } from '@/domain/crm/spreadsheetImportParentSearch';
import { CRM_IMPORT_PARENT_LIST_PAGE_SIZE } from '@/domain/crm/spreadsheetImportParentSearch';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { CreateCrmProjectModal } from '@/presentation/components/CrmProjects/CreateCrmProjectModal';
import {
  chooseParentRowClassName,
  filterChooseParentCandidates,
  nextChooseParentVisibleLimit,
  pageChooseParentCandidates,
  resolveChooseParentEmptyKind,
  resolveCreatedChooseParentCandidate,
} from '@/presentation/features/crmImport/interview/chooseParentPresentation';
import { formatRelativeUpdatedAt } from '@/presentation/features/crmProjects/crmProjectFormatters';
import styles from '@/presentation/components/CrmImport/SpreadsheetImportWizard.module.css';

export type ChooseParentScreenProps = {
  readonly candidates: readonly CrmImportParentCandidate[];
  readonly selectedId: string | null;
  readonly selectedLabel: string | null;
  readonly disabled?: boolean;
  readonly onSelect: (candidate: CrmImportParentCandidate) => void;
  readonly onClear: () => void;
  readonly onRefreshCandidates: () => Promise<readonly CrmImportParentCandidate[]>;
};

export function ChooseParentScreen({
  candidates,
  selectedId,
  selectedLabel,
  disabled = false,
  onSelect,
  onClear: _onClear,
  onRefreshCandidates,
}: ChooseParentScreenProps): ReactElement {
  const copy = content.crm.spreadsheetImport.interview.chooseParent;
  const searchId = useId();
  const listId = useId();
  const listRef = useRef<HTMLDivElement>(null);
  const createButtonRef = useRef<HTMLButtonElement>(null);
  const [query, setQuery] = useState('');
  const [visibleLimit, setVisibleLimit] = useState(CRM_IMPORT_PARENT_LIST_PAGE_SIZE);
  const [createOpen, setCreateOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const filtered = useMemo(
    () => filterChooseParentCandidates(candidates, query),
    [candidates, query]
  );

  const paged = useMemo(
    () => pageChooseParentCandidates(filtered, visibleLimit),
    [filtered, visibleLimit]
  );

  const emptyKind = resolveChooseParentEmptyKind({
    totalEligible: candidates.length,
    filteredCount: filtered.length,
    query,
  });

  useEffect(() => {
    setVisibleLimit(CRM_IMPORT_PARENT_LIST_PAGE_SIZE);
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    if (paged.visible.length === 0) {
      setActiveIndex(0);
      return;
    }
    setActiveIndex((index) => Math.min(index, paged.visible.length - 1));
  }, [paged.visible.length]);

  const selectedCandidate =
    selectedId != null ? candidates.find((candidate) => candidate.id === selectedId) : null;

  const openCreate = () => {
    if (disabled) return;
    setCreateOpen(true);
  };

  const selectByIndex = (index: number) => {
    const candidate = paged.visible[index];
    if (candidate == null || disabled) return;
    onSelect(candidate);
  };

  const onListKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (disabled || paged.visible.length === 0) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, paged.visible.length - 1));
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      selectByIndex(activeIndex);
    }
  };

  return (
    <div className={styles.chooseParentScreen}>
      <div className={styles.chooseParentIntro}>
        <h2 className={styles.chooseParentHeading}>{copy.heading}</h2>
        <p className={styles.chooseParentSubheading}>{copy.subheading}</p>
      </div>

      <div className={styles.chooseParentToolbar}>
        <label className={styles.chooseParentSearch} htmlFor={searchId}>
          <LuSearch className={styles.chooseParentSearchIcon} size={18} aria-hidden />
          <span className={styles.srOnly}>{copy.searchAriaLabel}</span>
          <input
            id={searchId}
            type="search"
            value={query}
            disabled={disabled}
            placeholder={copy.searchPlaceholder}
            aria-label={copy.searchAriaLabel}
            aria-controls={listId}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <button
          ref={createButtonRef}
          type="button"
          className={styles.chooseParentCreateButton}
          disabled={disabled}
          onClick={openCreate}
        >
          {copy.createButton}
        </button>
      </div>

      <div
        ref={listRef}
        className={styles.chooseParentListPanel}
        id={listId}
        role="listbox"
        aria-label={copy.listAriaLabel}
        aria-activedescendant={
          paged.visible[activeIndex] ? `choose-parent-row-${paged.visible[activeIndex]!.id}` : undefined
        }
        tabIndex={0}
        onKeyDown={onListKeyDown}
      >
        {emptyKind === 'none' ? (
          <>
            <div className={styles.chooseParentRows} aria-live="polite">
              <div className={styles.chooseParentTableHeader} aria-hidden>
                <span>{copy.columnProject}</span>
                <span>{copy.columnCustomer}</span>
                <span>{copy.columnLocation}</span>
                <span>{copy.columnSubprojects}</span>
                <span>{copy.columnUpdated}</span>
                <span />
              </div>
              {paged.visible.map((candidate, index) => {
                const selected = candidate.id === selectedId;
                return (
                  <button
                    key={candidate.id}
                    id={`choose-parent-row-${candidate.id}`}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    aria-label={copy.rowAriaLabel(candidate.name)}
                    disabled={disabled}
                    className={chooseParentRowClassName({
                      selected,
                      styles: {
                        row: styles.chooseParentRow,
                        selected: styles.chooseParentRowSelected,
                      },
                    })}
                    onMouseEnter={() => setActiveIndex(index)}
                    onFocus={() => setActiveIndex(index)}
                    onClick={() => onSelect(candidate)}
                  >
                    <span className={styles.chooseParentProjectCell}>
                      <span className={styles.chooseParentProjectIcon} aria-hidden>
                        <LuBuilding2 size={16} />
                      </span>
                      <span className={styles.chooseParentProjectText}>
                        <span className={styles.chooseParentProjectName}>{candidate.name}</span>
                        <span className={styles.chooseParentProjectStatus}>
                          <span className={styles.chooseParentStatusDot} aria-hidden />
                          {copy.activeStatus}
                        </span>
                      </span>
                    </span>
                    <span className={styles.chooseParentMetaCell} data-label={copy.columnCustomer}>
                      {candidate.clientName || '—'}
                    </span>
                    <span className={styles.chooseParentMetaCell} data-label={copy.columnLocation}>
                      {candidate.locationLabel || candidate.addressLabel || '—'}
                    </span>
                    <span
                      className={styles.chooseParentCountCell}
                      data-label={copy.columnSubprojects}
                    >
                      {candidate.subprojectCount.toLocaleString()}
                    </span>
                    <span className={styles.chooseParentUpdatedCell} data-label={copy.columnUpdated}>
                      {formatRelativeUpdatedAt(candidate.lastUpdatedAt)}
                    </span>
                    <span className={styles.chooseParentSelectCell} aria-hidden>
                      {selected ? (
                        <span className={styles.chooseParentCheck}>
                          <LuCheck size={14} strokeWidth={3} />
                        </span>
                      ) : (
                        <LuChevronRight size={18} className={styles.chooseParentChevron} />
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
            {paged.remainingCount > 0 ? (
              <button
                type="button"
                className={styles.chooseParentShowMore}
                disabled={disabled}
                onClick={() => setVisibleLimit((current) => nextChooseParentVisibleLimit(current))}
              >
                <LuChevronDown size={16} aria-hidden />
                {copy.showMore(paged.remainingCount)}
              </button>
            ) : null}
          </>
        ) : (
          <div className={styles.chooseParentEmpty}>
            <p className={styles.chooseParentEmptyTitle}>
              {emptyKind === 'no_eligible' ? copy.noEligibleTitle : copy.noResultsTitle}
            </p>
            <p className={styles.chooseParentEmptyBody}>
              {emptyKind === 'no_eligible' ? copy.noEligibleBody : copy.noResultsBody}
            </p>
            <button
              type="button"
              className={styles.chooseParentEmptyAction}
              disabled={disabled}
              onClick={openCreate}
            >
              {copy.createButtonShort}
            </button>
          </div>
        )}
      </div>

      {selectedCandidate != null || (selectedId != null && selectedLabel) ? (
        <p className={styles.chooseParentConfirm} aria-live="polite">
          {copy.selectedConfirm(selectedCandidate?.name ?? selectedLabel ?? '')}
        </p>
      ) : null}

      <CreateCrmProjectModal
        open={createOpen}
        completionBehavior="select_for_import"
        redirectOnCreate={false}
        onClose={() => {
          setCreateOpen(false);
          queueMicrotask(() => createButtonRef.current?.focus());
        }}
        onCreated={async (created) => {
          setCreateOpen(false);
          const refreshed = await onRefreshCandidates();
          const matched = resolveCreatedChooseParentCandidate(refreshed, created);
          onSelect(matched);
          queueMicrotask(() => listRef.current?.focus());
        }}
      />
    </div>
  );
}
