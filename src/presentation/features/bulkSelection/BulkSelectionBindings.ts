export type BulkSelectionBindings<TId extends string = string> = {
  readonly mode: boolean;
  readonly selectedIds: ReadonlySet<TId>;
  readonly onToggle: (id: TId) => void;
  readonly allVisibleSelected: boolean;
  readonly someVisibleSelected: boolean;
  readonly onToggleAllVisible: () => void;
  readonly selectItemAriaLabel: (label: string) => string;
  readonly selectAllAriaLabel: string;
};
