import { maskEmailForMemberDisplay } from '@/domain/buildcore/maskEmailForMemberDisplay';
import {
  CRM_INDUSTRIES,
  getPipelineStage,
  INDUSTRY_LABELS,
  getProjectIndustryDisplayLabel,
  type CrmIndustry,
  type PipelineStage,
  type PipelineStageSlug,
} from '@/domain/crm';

export { getProjectIndustryDisplayLabel, INDUSTRY_LABELS };

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

export function formatIndustryLabel(industry: CrmIndustry | string): string {
  if (industry in INDUSTRY_LABELS) {
    return INDUSTRY_LABELS[industry as CrmIndustry];
  }
  return industry
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/** Industry subtitle under project title in list/dashboard views. */
export function getProjectIndustrySubtitle(
  industry: CrmIndustry,
  customIndustry: string | null | undefined
): string {
  return getProjectIndustryDisplayLabel(industry, customIndustry);
}

export const CRM_INDUSTRY_OPTIONS = CRM_INDUSTRIES.map((value) => ({
  value,
  label: INDUSTRY_LABELS[value],
}));

export function isCrmIndustry(value: string): value is CrmIndustry {
  return (CRM_INDUSTRIES as readonly string[]).includes(value);
}
