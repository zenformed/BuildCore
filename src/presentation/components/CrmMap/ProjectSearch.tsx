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
import { DetailPanelSectionSearch } from '@/presentation/components/CrmProjectDetail/DetailPanelSectionSearch';
import {
  filterCrmMapSearchableProjects,
  type CrmMapSearchableProject,
} from '@/presentation/features/crmMap';
import styles from './CrmMap.module.css';

export type ProjectSearchProps = {
  readonly items: readonly CrmMapSearchableProject[];
  readonly onSelect: (item: CrmMapSearchableProject) => void;
};

export function ProjectSearch({ items, onSelect }: ProjectSearchProps): ReactElement {
  const listboxId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const results = useMemo(
    () => filterCrmMapSearchableProjects(items, query).slice(0, 40),
    [items, query]
  );

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

  const commit = (item: CrmMapSearchableProject) => {
    onSelect(item);
    setQuery(item.projectName);
    setOpen(false);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
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
      commit(results[activeIndex]);
    }
  };

  return (
    <div className={styles.searchWrap} ref={wrapRef}>
      <DetailPanelSectionSearch
        value={query}
        onChange={(value) => {
          setQuery(value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder="Search projects, customers, or addresses…"
        ariaLabel="Search map projects"
        className={styles.searchInput}
        role="combobox"
        ariaExpanded={open}
        ariaControls={listboxId}
        ariaAutocomplete="list"
      />
      {open ? (
        <div
          id={listboxId}
          className={styles.searchMenu}
          role="listbox"
          aria-label="Map search results"
        >
          {results.length === 0 ? (
            <div className={styles.searchEmpty}>No locatable projects match your search.</div>
          ) : (
            results.map((item, index) => (
              <button
                key={item.projectId}
                type="button"
                role="option"
                aria-selected={index === activeIndex}
                className={[
                  styles.searchOption,
                  index === activeIndex ? styles.searchOption_active : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => commit(item)}
              >
                <span className={styles.searchOptionName}>{item.projectName}</span>
                <span className={styles.searchOptionMeta}>
                  {item.isSubproject
                    ? `${item.parentProjectName} · ${item.marker.addressLabel}`
                    : item.marker.addressLabel}
                </span>
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
