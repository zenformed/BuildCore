export const DASHBOARD_LIST_VIEW_MODES = ['projects', 'subprojects'] as const;

export type DashboardListViewMode = (typeof DASHBOARD_LIST_VIEW_MODES)[number];

export const DEFAULT_DASHBOARD_LIST_VIEW_MODE: DashboardListViewMode = 'projects';

export function isDashboardListViewMode(value: string): value is DashboardListViewMode {
  return (DASHBOARD_LIST_VIEW_MODES as readonly string[]).includes(value);
}

export function parseDashboardListViewMode(
  value: string | null | undefined
): DashboardListViewMode {
  if (value != null && isDashboardListViewMode(value)) {
    return value;
  }
  return DEFAULT_DASHBOARD_LIST_VIEW_MODE;
}
