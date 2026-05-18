export function workflowTaskDueToInputValue(dueAt: string | null): string {
  if (dueAt == null) return '';
  return dueAt.slice(0, 10);
}

export function dueInputValueToIso(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? `${trimmed}T12:00:00.000Z` : null;
}
