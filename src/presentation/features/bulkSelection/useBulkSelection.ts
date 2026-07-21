'use client';

import { useCallback, useMemo, useState } from 'react';

export type UseBulkSelectionResult<TId extends string> = {
  readonly selectionMode: boolean;
  readonly selectedIds: ReadonlySet<TId>;
  readonly selectedCount: number;
  readonly enterSelectionMode: () => void;
  readonly exitSelectionMode: () => void;
  readonly toggle: (id: TId) => void;
  readonly selectAllVisible: (visibleIds: readonly TId[]) => void;
  readonly selectMany: (ids: readonly TId[]) => void;
  readonly deselectMany: (ids: readonly TId[]) => void;
  readonly clearSelection: () => void;
  readonly isSelected: (id: TId) => boolean;
  readonly allVisibleSelected: (visibleIds: readonly TId[]) => boolean;
  readonly someVisibleSelected: (visibleIds: readonly TId[]) => boolean;
};

export function useBulkSelection<TId extends string>(): UseBulkSelectionResult<TId> {
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<TId>>(() => new Set());

  const enterSelectionMode = useCallback(() => {
    setSelectionMode(true);
  }, []);

  const exitSelectionMode = useCallback(() => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }, []);

  const toggle = useCallback((id: TId) => {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAllVisible = useCallback((visibleIds: readonly TId[]) => {
    setSelectedIds(new Set(visibleIds));
  }, []);

  const selectMany = useCallback((ids: readonly TId[]) => {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      for (const id of ids) next.add(id);
      return next;
    });
  }, []);

  const deselectMany = useCallback((ids: readonly TId[]) => {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      for (const id of ids) next.delete(id);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const isSelected = useCallback((id: TId) => selectedIds.has(id), [selectedIds]);

  const allVisibleSelected = useCallback(
    (visibleIds: readonly TId[]) =>
      visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id)),
    [selectedIds]
  );

  const someVisibleSelected = useCallback(
    (visibleIds: readonly TId[]) => {
      const selected = visibleIds.filter((id) => selectedIds.has(id));
      return selected.length > 0 && selected.length < visibleIds.length;
    },
    [selectedIds]
  );

  const selectedCount = selectedIds.size;

  return useMemo(
    () => ({
      selectionMode,
      selectedIds,
      selectedCount,
      enterSelectionMode,
      exitSelectionMode,
      toggle,
      selectAllVisible,
      selectMany,
      deselectMany,
      clearSelection,
      isSelected,
      allVisibleSelected,
      someVisibleSelected,
    }),
    [
      allVisibleSelected,
      clearSelection,
      deselectMany,
      enterSelectionMode,
      exitSelectionMode,
      isSelected,
      selectAllVisible,
      selectMany,
      selectedCount,
      selectedIds,
      selectionMode,
      someVisibleSelected,
      toggle,
    ]
  );
}
