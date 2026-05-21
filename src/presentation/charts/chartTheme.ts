export type ChartTheme = {
  readonly textMuted: string;
  readonly border: string;
  readonly grid: string;
  readonly line: string;
  readonly pointBorder: string;
  readonly tooltipBg: string;
  readonly tooltipText: string;
};

const LIGHT_THEME: ChartTheme = {
  textMuted: '#64748b',
  border: '#94a3b8',
  grid: '#e2e8f0',
  line: '#2563eb',
  pointBorder: '#ffffff',
  tooltipBg: '#ffffff',
  tooltipText: '#0f172a',
};

const DARK_THEME: ChartTheme = {
  textMuted: '#94a3b8',
  border: '#64748b',
  grid: '#2e3340',
  line: '#60a5fa',
  pointBorder: '#252836',
  tooltipBg: '#1a1d26',
  tooltipText: '#f1f5f9',
};

export function getChartTheme(): ChartTheme {
  if (typeof document === 'undefined') return LIGHT_THEME;
  return document.documentElement.getAttribute('data-theme') === 'dark' ? DARK_THEME : LIGHT_THEME;
}
