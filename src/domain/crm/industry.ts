export type CrmIndustry =
  | 'hvac'
  | 'roofing'
  | 'restoration'
  | 'inspections'
  | 'general-contractor'
  | 'electrical'
  | 'plumbing'
  | 'painting'
  | 'flooring'
  | 'landscaping'
  | 'tree-service'
  | 'pool-construction'
  | 'property-management'
  | 'cleaning-services'
  | 'handyman-services'
  | 'real-estate'
  | 'wedding-planning'
  | 'event-planning'
  | 'photography'
  | 'videography'
  | 'marketing-agency'
  | 'it-services'
  | 'manufacturing'
  | 'fabrication'
  | 'consulting'
  | 'other';

export const CRM_INDUSTRIES: readonly CrmIndustry[] = [
  'hvac',
  'roofing',
  'restoration',
  'inspections',
  'general-contractor',
  'electrical',
  'plumbing',
  'painting',
  'flooring',
  'landscaping',
  'tree-service',
  'pool-construction',
  'property-management',
  'cleaning-services',
  'handyman-services',
  'real-estate',
  'wedding-planning',
  'event-planning',
  'photography',
  'videography',
  'marketing-agency',
  'it-services',
  'manufacturing',
  'fabrication',
  'consulting',
  'other',
] as const;

export const INDUSTRY_LABELS: Record<CrmIndustry, string> = {
  hvac: 'HVAC',
  roofing: 'Roofing',
  restoration: 'Restoration',
  inspections: 'Inspections',
  'general-contractor': 'General Contractor',
  electrical: 'Electrical',
  plumbing: 'Plumbing',
  painting: 'Painting',
  flooring: 'Flooring',
  landscaping: 'Landscaping',
  'tree-service': 'Tree Service',
  'pool-construction': 'Pool Construction',
  'property-management': 'Property Management',
  'cleaning-services': 'Cleaning Services',
  'handyman-services': 'Handyman Services',
  'real-estate': 'Real Estate',
  'wedding-planning': 'Wedding Planning',
  'event-planning': 'Event Planning',
  photography: 'Photography',
  videography: 'Videography',
  'marketing-agency': 'Marketing Agency',
  'it-services': 'IT Services',
  manufacturing: 'Manufacturing',
  fabrication: 'Fabrication',
  consulting: 'Consulting',
  other: 'Other',
};

export function isCrmIndustry(value: string): value is CrmIndustry {
  return (CRM_INDUSTRIES as readonly string[]).includes(value);
}

export function asCrmIndustry(value: string, fallback: CrmIndustry = 'general-contractor'): CrmIndustry {
  return isCrmIndustry(value) ? value : fallback;
}

export function validateCrmIndustryFields(
  industry: CrmIndustry | null,
  customIndustry: string | null | undefined
): { ok: true; industry: CrmIndustry; customIndustry: string | null } | { ok: false; message: string } {
  if (industry == null || !isCrmIndustry(industry)) {
    return { ok: false, message: 'Industry is invalid.' };
  }
  if (industry === 'other') {
    const trimmed = customIndustry?.trim() ?? '';
    if (!trimmed) {
      return { ok: false, message: 'Custom industry is required when Industry is Other.' };
    }
    return { ok: true, industry, customIndustry: trimmed };
  }
  return { ok: true, industry, customIndustry: null };
}

/** User-facing industry label; custom text replaces "Other" when set. */
export function getProjectIndustryDisplayLabel(
  industry: CrmIndustry,
  customIndustry: string | null | undefined
): string {
  if (industry === 'other') {
    const trimmed = customIndustry?.trim();
    if (trimmed) return trimmed;
  }
  return INDUSTRY_LABELS[industry];
}
