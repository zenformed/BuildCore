'use client';

import type { ReactElement } from 'react';
import type { PeriodComparison } from '@/reports/types/crmReportsDashboard';
import projectStyles from '../CrmProjectDetail/ProjectDetail.module.css';
import styles from './CrmReports.module.css';

export type ReportsKpiIcon = 'collected' | 'receivables' | 'netProfit';

export type ReportsKpiCardProps = {
  icon: ReportsKpiIcon;
  mainDisplay: string;
  /** What this KPI measures (e.g. Collected Revenue), not the selected period. */
  metricLabel: string;
  comparison: PeriodComparison;
  footLeftValue: string;
  footLeftLabel: string;
  footRightValue: string;
  footRightLabel: string;
};

function formatTrendPercent(percent: number): string {
  const abs = Math.abs(percent);
  const text = Number.isInteger(abs) ? abs.toFixed(0) : abs.toFixed(2);
  return `${text}%`;
}

function trendClass(percent: number | null): string {
  if (percent == null || Number.isNaN(percent) || percent === 0) {
    return styles.kpiTrend;
  }
  return percent > 0 ? `${styles.kpiTrend} ${styles.kpiTrendUp}` : `${styles.kpiTrend} ${styles.kpiTrendDown}`;
}

const KPI_ICON_CLASS: Record<ReportsKpiIcon, string> = {
  collected: styles.kpiIcon_collected,
  receivables: styles.kpiIcon_receivables,
  netProfit: styles.kpiIcon_netProfit,
};

function kpiMainSizeClass(display: string, hasTrend: boolean): string | undefined {
  const len = display.length;
  if (hasTrend) {
    if (len >= 10) return styles.kpiMain_xs;
    if (len >= 8) return styles.kpiMain_sm;
    if (len >= 6) return styles.kpiMain_md;
    return undefined;
  }
  if (len >= 11) return styles.kpiMain_xs;
  if (len >= 9) return styles.kpiMain_sm;
  if (len >= 7) return styles.kpiMain_md;
  return undefined;
}

export function ReportsKpiCard({
  icon,
  mainDisplay,
  metricLabel,
  comparison,
  footLeftValue,
  footLeftLabel,
  footRightValue,
  footRightLabel,
}: ReportsKpiCardProps): ReactElement {
  const showTrend = comparison.percent != null && !Number.isNaN(comparison.percent);
  const trendUp = (comparison.percent ?? 0) > 0;
  const trendDown = (comparison.percent ?? 0) < 0;
  const mainSizeClass = kpiMainSizeClass(mainDisplay, showTrend);

  return (
    <article
      className={`${projectStyles.card} ${styles.kpiCard}`}
      aria-label={`${metricLabel}: ${mainDisplay}`}
    >
      <div className={styles.kpiHero}>
        <div className={styles.kpiHeroCluster}>
          <span className={`${styles.kpiIcon} ${KPI_ICON_CLASS[icon]}`} aria-hidden />
          <div className={styles.kpiHeroText}>
            <div className={styles.kpiAmountStack}>
              <span className={styles.kpiMainLine}>
                <span className={[styles.kpiMain, mainSizeClass].filter(Boolean).join(' ')}>
                  {mainDisplay}
                </span>
                {showTrend ? (
                  <span className={trendClass(comparison.percent)} title={comparison.label}>
                    <span className={styles.kpiTrendArrow} aria-hidden>
                      {trendUp ? '▲' : trendDown ? '▼' : '•'}
                    </span>
                    {formatTrendPercent(comparison.percent!)}
                  </span>
                ) : null}
              </span>
              <p className={styles.kpiMetricLabel}>{metricLabel}</p>
            </div>
          </div>
        </div>
      </div>
      <div className={styles.kpiFoot}>
        <div className={styles.kpiFootStat}>
          <span className={styles.kpiFootValue}>{footLeftValue}</span>
          <span className={styles.kpiFootLabel}>{footLeftLabel}</span>
        </div>
        <div className={styles.kpiFootStat}>
          <span className={styles.kpiFootValue}>{footRightValue}</span>
          <span className={styles.kpiFootLabel}>{footRightLabel}</span>
        </div>
      </div>
    </article>
  );
}
