export type ChartTheme = {
  readonly textMuted: string;
  readonly border: string;
  readonly grid: string;
  readonly line: string;
  readonly pointBorder: string;
  readonly tooltipBg: string;
  readonly tooltipText: string;
  readonly pointHover: string;
};

/** SSR / pre-hydration fallbacks when document is unavailable */
const LIGHT_FALLBACK: ChartTheme = {
  textMuted: '#64748b',
  border: '#e0e2e5',
  grid: '#e8eaed',
  line: '#5a7a9e',
  pointBorder: '#ffffff',
  tooltipBg: '#ffffff',
  tooltipText: '#1e293b',
  pointHover: '#4d6d8f',
};

const DARK_FALLBACK: ChartTheme = {
  textMuted: '#94a3b8',
  border: '#64748b',
  grid: '#2e3340',
  line: '#60a5fa',
  pointBorder: '#252836',
  tooltipBg: '#1a1d26',
  tooltipText: '#f1f5f9',
  pointHover: '#93c5fd',
};

const CHART_CSS_VARS: Readonly<Record<keyof ChartTheme, string>> = {
  textMuted: '--chart-text-muted',
  border: '--chart-border',
  grid: '--chart-grid',
  line: '--chart-line',
  pointBorder: '--chart-point-border',
  tooltipBg: '--chart-tooltip-bg',
  tooltipText: '--chart-tooltip-text',
  pointHover: '--chart-point-hover',
};

function readCssToken(varName: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  return value || fallback;
}

function isDarkTheme(): boolean {
  if (typeof document === 'undefined') return false;
  return document.documentElement.getAttribute('data-theme') === 'dark';
}

export function getChartTheme(): ChartTheme {
  const fallback = isDarkTheme() ? DARK_FALLBACK : LIGHT_FALLBACK;
  return {
    textMuted: readCssToken(CHART_CSS_VARS.textMuted, fallback.textMuted),
    border: readCssToken(CHART_CSS_VARS.border, fallback.border),
    grid: readCssToken(CHART_CSS_VARS.grid, fallback.grid),
    line: readCssToken(CHART_CSS_VARS.line, fallback.line),
    pointBorder: readCssToken(CHART_CSS_VARS.pointBorder, fallback.pointBorder),
    tooltipBg: readCssToken(CHART_CSS_VARS.tooltipBg, fallback.tooltipBg),
    tooltipText: readCssToken(CHART_CSS_VARS.tooltipText, fallback.tooltipText),
    pointHover: readCssToken(CHART_CSS_VARS.pointHover, fallback.pointHover),
  };
}
