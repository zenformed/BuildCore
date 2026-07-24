/**
 * Mode-specific intro copy helpers for the spreadsheet import wizard.
 */

import type { CrmImportMode } from '@/domain/crm/spreadsheetImportTypes';

export function getSpreadsheetImportWizardTitle(mode: CrmImportMode): string {
  return mode === 'into_existing_parent'
    ? 'Import subprojects'
    : 'Import projects and subprojects';
}

export function getSpreadsheetImportContextParagraphs(mode: CrmImportMode): readonly string[] {
  if (mode === 'into_existing_parent') {
    return ['Each included spreadsheet row will create one subproject under this project.'];
  }
  return [
    'BuildCore will use your mapped columns to detect parent projects and the subprojects beneath them.',
    'Each included row creates one subproject. Parent projects are created once per detected group or attached to an existing BuildCore project.',
  ];
}
