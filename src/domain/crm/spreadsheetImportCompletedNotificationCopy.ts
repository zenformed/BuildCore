import type { CrmImportJobCounts } from '@/domain/crm/spreadsheetImportTypes';

export const SPREADSHEET_IMPORT_COMPLETED_NOTIFICATION_TITLE = 'Import completed';

export function buildSpreadsheetImportCompletedNotificationBody(input: {
  readonly actorDisplayName: string;
  readonly counts: CrmImportJobCounts;
}): string {
  const actor = input.actorDisplayName.trim() || 'Someone';
  const createdSubprojects = Math.max(0, input.counts.createdSubprojects);
  const failedRows = Math.max(0, input.counts.failedRows + input.counts.invalidRows);

  if (failedRows > 0) {
    return `${actor} completed an import with ${createdSubprojects.toLocaleString()} subprojects created and ${failedRows.toLocaleString()} rows needing attention.`;
  }
  return `${actor} completed an import with ${createdSubprojects.toLocaleString()} subprojects created.`;
}

export function buildSpreadsheetImportCompletedEmailSubject(): string {
  return 'Your BuildCore import is complete';
}

export function buildSpreadsheetImportCompletedEmailMessage(input: {
  readonly counts: CrmImportJobCounts;
  readonly destinationUrl: string;
}): string {
  const createdSubprojects = Math.max(0, input.counts.createdSubprojects);
  const createdParents = Math.max(0, input.counts.createdParents);
  const failedRows = Math.max(0, input.counts.failedRows + input.counts.invalidRows);

  const summary =
    failedRows > 0
      ? `Created ${createdSubprojects.toLocaleString()} subprojects, ${createdParents.toLocaleString()} parent projects, and ${failedRows.toLocaleString()} rows need attention.`
      : `Created ${createdSubprojects.toLocaleString()} subprojects and ${createdParents.toLocaleString()} parent projects.`;

  return `${summary}\n\nOpen BuildCore: ${input.destinationUrl}`;
}
