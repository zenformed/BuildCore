'use client';

import { useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import type { ReportsTimeSeries } from '@/reports/types/crmReportsDashboard';
import styles from './CrmReports.module.css';

type ReportsLineChartProps = {
  series: ReportsTimeSeries;
  formatValue: (cents: number) => string;
};

const PAD_TOP = 18;
const PAD_RIGHT = 28;
const PAD_BOTTOM = 34;
/** Horizontal inset so the plot does not span edge-to-edge inside the chart area. */
const PLOT_INSET_X = 12;
const Y_TICK_COUNT = 5;
const MIN_CHART_WIDTH = 280;
const MIN_CHART_HEIGHT = 200;

function shouldShowXAxisLabel(index: number, total: number): boolean {
  if (total <= 12) return true;
  if (total <= 24) return index % 2 === 0 || index === total - 1;
  const step = Math.ceil(total / 12);
  return index % step === 0 || index === total - 1;
}

function measureYAxisPadLeft(maxCents: number, formatValue: (cents: number) => string): number {
  const label = formatValue(maxCents);
  return Math.max(52, label.length * 6.5 + 18);
}

export function ReportsLineChart({ series, formatValue }: ReportsLineChartProps): ReactElement {
  const innerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: MIN_CHART_WIDTH, height: MIN_CHART_HEIGHT });

  useEffect(() => {
    const el = innerRef.current;
    if (!el) return;

    const update = (): void => {
      const { width, height } = el.getBoundingClientRect();
      if (width > 0 && height > 0) {
        setSize({
          width: Math.max(MIN_CHART_WIDTH, Math.floor(width)),
          height: Math.max(MIN_CHART_HEIGHT, Math.floor(height)),
        });
      }
    };

    const observer = new ResizeObserver(update);
    observer.observe(el);
    update();
    return () => observer.disconnect();
  }, []);

  const { labels, tooltipLabels, valuesCents } = series;

  const geometry = useMemo(() => {
    if (labels.length === 0) return null;

    const max = Math.max(...valuesCents, 1);
    const padLeft = measureYAxisPadLeft(max, formatValue) + PLOT_INSET_X;
    const padRight = PAD_RIGHT + PLOT_INSET_X;
    const plotW = size.width - padLeft - padRight;
    const plotH = size.height - PAD_TOP - PAD_BOTTOM;
    const yTicks = Array.from({ length: Y_TICK_COUNT }, (_, i) => (max * i) / (Y_TICK_COUNT - 1));

    const points = valuesCents.map((value, index) => {
      const x =
        labels.length === 1
          ? padLeft + plotW / 2
          : padLeft + (index / (labels.length - 1)) * plotW;
      const y = PAD_TOP + plotH - (value / max) * plotH;
      return { x, y, value };
    });

    return { max, padLeft, padRight, plotW, plotH, yTicks, points };
  }, [labels, valuesCents, size, formatValue]);

  if (labels.length === 0 || geometry == null) {
    return (
      <div className={styles.chartWrap}>
        <p className={styles.chartEmpty}>No data for this period.</p>
      </div>
    );
  }

  const { padLeft, plotW, plotH, yTicks, points } = geometry;
  const polyline = points.map((p) => `${p.x},${p.y}`).join(' ');
  const baselineY = PAD_TOP + plotH;

  return (
    <div className={styles.chartWrap}>
      <div ref={innerRef} className={styles.chartInner}>
        <svg
          className={styles.lineChart}
          width={size.width}
          height={size.height}
          viewBox={`0 0 ${size.width} ${size.height}`}
          preserveAspectRatio="none"
          role="img"
          aria-label="Report trend chart"
        >
        {yTicks.map((tick, i) => {
          const y = PAD_TOP + plotH - (tick / geometry.max) * plotH;
          return (
            <g key={`y-${i}`}>
              <line
                x1={padLeft}
                y1={y}
                x2={padLeft + plotW}
                y2={y}
                className={styles.chartGrid}
              />
              <text
                x={padLeft - 8}
                y={y + 4}
                textAnchor="end"
                className={styles.chartYLabel}
              >
                {formatValue(tick)}
              </text>
            </g>
          );
        })}
        <line
          x1={padLeft}
          y1={PAD_TOP}
          x2={padLeft}
          y2={baselineY}
          className={styles.chartAxis}
        />
        <line
          x1={padLeft}
          y1={baselineY}
          x2={padLeft + plotW}
          y2={baselineY}
          className={styles.chartAxis}
        />
        <polyline points={polyline} className={styles.chartLine} fill="none" vectorEffect="non-scaling-stroke" />
        {points.map((p, i) => (
          <g key={`${labels[i]}-${i}`}>
            <circle cx={p.x} cy={p.y} r={4} className={styles.chartPoint} vectorEffect="non-scaling-stroke" />
            <title>{`${tooltipLabels[i] ?? labels[i]}: ${formatValue(p.value)}`}</title>
          </g>
        ))}
        {labels.map((label, index) => {
          if (!shouldShowXAxisLabel(index, labels.length)) return null;
          const x =
            labels.length === 1
              ? padLeft + plotW / 2
              : padLeft + (index / (labels.length - 1)) * plotW;
          return (
            <text
              key={label + index}
              x={x}
              y={size.height - 10}
              textAnchor="middle"
              className={styles.chartLabel}
            >
              {label}
            </text>
          );
        })}
        </svg>
      </div>
    </div>
  );
}
