import { maskEmailForMemberDisplay } from '@/domain/buildcore/maskEmailForMemberDisplay';
import {
  CRM_TRADE_TYPES,
  getPipelineStage,
  type CrmTradeType,
  type PipelineStage,
  type PipelineStageSlug,
} from '@/domain/crm';

/** Display labels for `CrmProjectSummary.tradeType` (not client industry/type). */
export const TRADE_LABELS: Record<CrmTradeType, string> = {
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

export function formatStageLabel(
  slug: PipelineStageSlug,
  stages?: readonly PipelineStage[] | null
): string {
  return getPipelineStage(slug, stages).label;
}

/** US-style display: 9186713407 → 918-671-3407; leaves non-10-digit values unchanged. */
export function formatPhoneDisplay(phone: string): string {
  const trimmed = phone.trim();
  if (!trimmed) return '';
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits.startsWith('1')) {
    return `${digits.slice(1, 4)}-${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return trimmed;
}

export function formatContactEmailDisplay(
  email: string,
  options?: { maskForMember?: boolean }
): string {
  const trimmed = email.trim();
  if (!trimmed) return '';
  if (options?.maskForMember) {
    return maskEmailForMemberDisplay(trimmed);
  }
  return trimmed;
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

export const CRM_TRADE_TYPE_OPTIONS = CRM_TRADE_TYPES.map((value) => ({
  value,
  label: TRADE_LABELS[value],
}));

export function isCrmTradeType(value: string): value is CrmTradeType {
  return (CRM_TRADE_TYPES as readonly string[]).includes(value);
}
