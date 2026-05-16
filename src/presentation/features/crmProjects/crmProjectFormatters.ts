import { getPipelineStage, type PipelineStageSlug } from '@/domain/crm';

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

export function formatTradeLabel(trade: string): string {
  return trade
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
