import { NextResponse } from 'next/server';
import { CrmIndustryMigrationRequiredError } from '@/infrastructure/crm/server/crmProjectIndustrySchema';

export function mapCrmRouteError(err: unknown, fallbackMessage: string): NextResponse {
  if (err instanceof CrmIndustryMigrationRequiredError) {
    return NextResponse.json({ error: 'migration_required', message: err.message }, { status: 503 });
  }

  const message = err instanceof Error ? err.message : fallbackMessage;
  return NextResponse.json({ error: 'internal_error', message }, { status: 500 });
}
