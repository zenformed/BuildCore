import { getPipelineStage, type CrmTradeType, type PipelineStageSlug } from '@/domain/crm';

/** Display labels for `CrmProjectSummary.tradeType` (not client industry/type). */
const TRADE_LABELS: Record<CrmTradeType, string> = {
  hvac: 'HVAC',
  roofing: 'Roofing',
  restoration: 'Restoration',
  inspections: 'Inspections',
  'make-ready': 'Make Ready',
  'general-contractor': 'General Contractor',
};

export function formatCentsAsUsd(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function formatStageLabel(slug: PipelineStageSlug): string {
  return getPipelineStage(slug).label;
}

export function formatRelativeUpdatedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

export function formatTradeLabel(trade: CrmTradeType | string): string {
  if (trade in TRADE_LABELS) {
    return TRADE_LABELS[trade as CrmTradeType];
  }
  return trade
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/** Trade subtitle under project title — only when trade_type is set on the project row. */
export function getProjectTradeSubtitle(tradeType: CrmTradeType): string | null {
  return TRADE_LABELS[tradeType] ?? null;
}
