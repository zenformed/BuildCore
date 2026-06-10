import type { SupabaseClient } from '@supabase/supabase-js';
import type { CrmIndustry } from '@/domain/crm';
import type { CreateCrmProjectInput } from '@/domain/crm/createProject';

export type CrmProjectIndustrySchemaMode = 'industry' | 'legacy';

const LEGACY_TRADE_TYPES = new Set<CrmIndustry | 'make-ready'>([
  'hvac',
  'roofing',
  'restoration',
  'inspections',
  'make-ready',
  'general-contractor',
]);

const MIGRATION_HINT =
  'Apply supabase/migrations/00029_crm_projects_industry.sql in the Supabase SQL editor.';

export class CrmIndustryMigrationRequiredError extends Error {
  constructor(message = MIGRATION_HINT) {
    super(message);
    this.name = 'CrmIndustryMigrationRequiredError';
  }
}

function isMissingColumnError(message: string | undefined, column: 'industry' | 'trade_type'): boolean {
  if (!message) return false;
  return new RegExp(`column\\s+crm_projects\\.${column}\\s+does not exist`, 'i').test(message);
}

export async function getCrmProjectIndustrySchemaMode(
  supabase: SupabaseClient
): Promise<CrmProjectIndustrySchemaMode> {
  const industryProbe = await supabase.from('crm_projects').select('industry').limit(0);
  if (!industryProbe.error) {
    return 'industry';
  }

  if (isMissingColumnError(industryProbe.error.message, 'industry')) {
    const legacyProbe = await supabase.from('crm_projects').select('trade_type').limit(0);
    if (!legacyProbe.error) {
      return 'legacy';
    }
  }

  throw new Error(industryProbe.error.message ?? 'Failed to detect CRM project industry schema.');
}

export function crmProjectIndustrySelectLines(mode: CrmProjectIndustrySchemaMode): string {
  return mode === 'industry' ? '  industry,\n  custom_industry,' : '  trade_type,';
}

export function buildCrmProjectIndustryWritePayload(
  mode: CrmProjectIndustrySchemaMode,
  input: Pick<CreateCrmProjectInput, 'industry' | 'customIndustry'>
): Record<string, string | null> {
  if (mode === 'industry') {
    return {
      industry: input.industry,
      custom_industry: input.customIndustry,
    };
  }

  if (input.industry === 'other') {
    throw new CrmIndustryMigrationRequiredError(
      `Custom industry values require the industry migration. ${MIGRATION_HINT}`
    );
  }

  if (!LEGACY_TRADE_TYPES.has(input.industry)) {
    throw new CrmIndustryMigrationRequiredError(
      `Industry "${input.industry}" requires the industry migration. ${MIGRATION_HINT}`
    );
  }

  return { trade_type: input.industry };
}
